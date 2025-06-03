// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0
import type { InvokeModelWithBidirectionalStreamInput } from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockRuntimeClient,
  InvokeModelWithBidirectionalStreamCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type { AsyncIterableQueue, Future } from '@livekit/agents';
import { Queue, llm, log, mergeFrames, multimodal } from '@livekit/agents';
import { AudioFrame } from '@livekit/rtc-node';
import * as api_proto from './api_proto.js';

interface ModelOptions {
  modalities: ['text', 'audio'] | ['text'];
  instructions: string;
  voice: api_proto.Voice;
  inputAudioFormat: api_proto.AudioFormat;
  outputAudioFormat: api_proto.AudioFormat;
  inputAudioTranscription: api_proto.InputAudioTranscription | null;
  turnDetection: api_proto.TurnDetectionType | null;
  temperature: number;
  maxResponseOutputTokens: number;
  model: api_proto.Model;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface RealtimeResponse {
  id: string;
  status: api_proto.ResponseStatus;
  statusDetails: api_proto.ResponseStatusDetails | null;
  usage: api_proto.ModelUsage | null;
  output: RealtimeOutput[];
  doneFut: Future;
  createdTimestamp: number;
  firstTokenTimestamp?: number;
}

export interface RealtimeOutput {
  responseId: string;
  itemId: string;
  outputIndex: number;
  role: api_proto.Role;
  type: 'message' | 'function_call';
  content: RealtimeContent[];
  doneFut: Future;
}

export interface RealtimeContent {
  responseId: string;
  itemId: string;
  outputIndex: number;
  contentIndex: number;
  text: string;
  audio: AudioFrame[];
  textStream: AsyncIterableQueue<string>;
  audioStream: AsyncIterableQueue<AudioFrame>;
  toolCalls: RealtimeToolCall[];
  contentType: api_proto.Modality;
}

export interface RealtimeToolCall {
  name: string;
  arguments: string;
  toolCallID: string;
}

export interface InputSpeechTranscriptionCompleted {
  itemId: string;
  transcript: string;
}

export interface InputSpeechTranscriptionFailed {
  itemId: string;
  message: string;
}

export interface InputSpeechStarted {
  itemId: string;
}

export interface InputSpeechCommitted {
  itemId: string;
}

class InputAudioBuffer {
  #session: RealtimeSession;

  constructor(session: RealtimeSession) {
    this.#session = session;
  }

  append(frame: AudioFrame) {
    this.#session.queueMsg({
      type: 'input_audio_buffer.append',
      audio: Buffer.from(frame.data.buffer).toString('base64'),
    });
  }

  clear() {
    this.#session.queueMsg({
      type: 'input_audio_buffer.clear',
    });
  }

  commit() {
    this.#session.queueMsg({
      type: 'input_audio_buffer.commit',
    });
  }
}

class ConversationItem {
  #session: RealtimeSession;
  #logger = log();

  constructor(session: RealtimeSession) {
    this.#session = session;
  }

  truncate(itemId: string, contentIndex: number, audioEnd: number) {
    this.#session.queueMsg({
      type: 'conversation.item.truncate',
      item_id: itemId,
      content_index: contentIndex,
      audio_end_ms: audioEnd,
    });
  }

  delete(itemId: string) {
    this.#session.queueMsg({
      type: 'conversation.item.delete',
      item_id: itemId,
    });
  }

  create(message: llm.ChatMessage, previousItemId?: string): void {
    if (!message.content) {
      return;
    }

    let event: api_proto.ConversationItemCreateEvent;

    if (message.toolCallId) {
      if (typeof message.content !== 'string') {
        throw new TypeError('message.content must be a string');
      }

      event = {
        type: 'conversation.item.create',
        previous_item_id: previousItemId,
        item: {
          type: 'function_call_output',
          call_id: message.toolCallId,
          output: message.content,
        },
      };
    } else {
      let content = message.content;
      if (!Array.isArray(content)) {
        content = [content];
      }

      if (message.role === llm.ChatRole.USER) {
        const contents: (api_proto.InputTextContent | api_proto.InputAudioContent)[] = [];
        for (const c of content) {
          if (typeof c === 'string') {
            contents.push({
              type: 'input_text',
              text: c,
            });
          } else if (
            ((c: llm.ChatAudio | llm.ChatImage): c is llm.ChatAudio => {
              return (c as llm.ChatAudio).frame !== undefined;
            })(c)
          ) {
            contents.push({
              type: 'input_audio',
              audio: Buffer.from(mergeFrames(c.frame).data.buffer).toString('base64'),
            });
          }
        }

        event = {
          type: 'conversation.item.create',
          previous_item_id: previousItemId,
          item: {
            type: 'message',
            role: 'user',
            content: contents,
          },
        };
      } else if (message.role === llm.ChatRole.ASSISTANT) {
        const contents: api_proto.TextContent[] = [];
        for (const c of content) {
          if (typeof c === 'string') {
            contents.push({
              type: 'text',
              text: c,
            });
          }
        }

        event = {
          type: 'conversation.item.create',
          previous_item_id: previousItemId,
          item: {
            type: 'message',
            role: 'assistant',
            content: contents,
          },
        };
      } else if (message.role === llm.ChatRole.SYSTEM) {
        const contents: api_proto.InputTextContent[] = [];
        for (const c of content) {
          if (typeof c === 'string') {
            contents.push({
              type: 'input_text',
              text: c,
            });
          }
        }

        event = {
          type: 'conversation.item.create',
          previous_item_id: previousItemId,
          item: {
            type: 'message',
            role: 'system',
            content: contents,
          },
        };
      } else {
        throw new TypeError(`unsupported role: ${message.role}`);
      }
    }

    this.#session.queueMsg(event);
  }
}

class Conversation {
  #session: RealtimeSession;
  #item: ConversationItem;

  constructor(session: RealtimeSession) {
    this.#session = session;
    this.#item = new ConversationItem(session);
  }

  get item(): ConversationItem {
    return this.#item;
  }
}

class Response {
  #session: RealtimeSession;

  constructor(session: RealtimeSession) {
    this.#session = session;
  }

  create() {
    this.#session.queueMsg({
      type: 'response.create',
    });
  }

  cancel() {
    this.#session.queueMsg({
      type: 'response.cancel',
    });
  }
}

export class RealtimeModel extends multimodal.RealtimeModel {
  sampleRate = api_proto.SAMPLE_RATE;
  numChannels = api_proto.NUM_CHANNELS;
  inFrameSize = api_proto.IN_FRAME_SIZE;
  outFrameSize = api_proto.OUT_FRAME_SIZE;

  #defaultOpts: ModelOptions;
  #sessions: RealtimeSession[] = [];

  constructor({
    modalities = ['text', 'audio'],
    instructions = '',
    voice = 'nova',
    inputAudioFormat = 'pcm16',
    outputAudioFormat = 'pcm16',
    inputAudioTranscription = { model: 'amazon-transcribe' },
    turnDetection = { type: 'server_vad' },
    temperature = 0.8,
    maxResponseOutputTokens = Infinity,
    model = 'nova-sonic',
    region = process.env.AWS_REGION || '',
    accessKeyId = process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '',
  }: {
    modalities?: ['text', 'audio'] | ['text'];
    instructions?: string;
    voice?: api_proto.Voice;
    inputAudioFormat?: api_proto.AudioFormat;
    outputAudioFormat?: api_proto.AudioFormat;
    inputAudioTranscription?: api_proto.InputAudioTranscription;
    turnDetection?: api_proto.TurnDetectionType;
    temperature?: number;
    maxResponseOutputTokens?: number;
    model?: api_proto.Model;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  }) {
    super();
    this.#defaultOpts = {
      modalities,
      instructions,
      voice,
      inputAudioFormat,
      outputAudioFormat,
      inputAudioTranscription,
      turnDetection,
      temperature,
      maxResponseOutputTokens,
      model,
      region,
      accessKeyId,
      secretAccessKey,
    };
  }

  get sessions(): RealtimeSession[] {
    return this.#sessions;
  }

  session({
    fncCtx,
    chatCtx,
    modalities = this.#defaultOpts.modalities,
    instructions = this.#defaultOpts.instructions,
    voice = this.#defaultOpts.voice,
    inputAudioFormat = this.#defaultOpts.inputAudioFormat,
    outputAudioFormat = this.#defaultOpts.outputAudioFormat,
    inputAudioTranscription = this.#defaultOpts.inputAudioTranscription,
    turnDetection = this.#defaultOpts.turnDetection,
    temperature = this.#defaultOpts.temperature,
    maxResponseOutputTokens = this.#defaultOpts.maxResponseOutputTokens,
  }: {
    fncCtx?: llm.FunctionContext;
    chatCtx?: llm.ChatContext;
    modalities?: ['text', 'audio'] | ['text'];
    instructions?: string;
    voice?: api_proto.Voice;
    inputAudioFormat?: api_proto.AudioFormat;
    outputAudioFormat?: api_proto.AudioFormat;
    inputAudioTranscription?: api_proto.InputAudioTranscription | null;
    turnDetection?: api_proto.TurnDetectionType | null;
    temperature?: number;
    maxResponseOutputTokens?: number;
  }): RealtimeSession {
    const session = new RealtimeSession(
      {
        ...this.#defaultOpts,
        modalities,
        instructions,
        voice,
        inputAudioFormat,
        outputAudioFormat,
        inputAudioTranscription,
        turnDetection,
        temperature,
        maxResponseOutputTokens,
      },
      { fncCtx, chatCtx },
    );
    this.#sessions.push(session);
    return session;
  }

  async close() {
    await Promise.all(this.#sessions.map((session) => session.close()));
    this.#sessions = [];
  }
}

export class RealtimeSession extends multimodal.RealtimeSession {
  #opts: ModelOptions;
  #fncCtx?: llm.FunctionContext;
  #chatCtx?: llm.ChatContext;
  #conversation: Conversation;
  #inputAudioBuffer: InputAudioBuffer;
  #response: Response;
  #bedrockClient?: BedrockRuntimeClient;
  #logger = log();
  #sendQueue = new Queue<api_proto.ClientEvent>();

  constructor(
    opts: ModelOptions,
    { fncCtx, chatCtx }: { fncCtx?: llm.FunctionContext; chatCtx?: llm.ChatContext },
  ) {
    super();
    this.#opts = opts;
    this.#fncCtx = fncCtx;
    this.#chatCtx = chatCtx;
    this.#conversation = new Conversation(this);
    this.#inputAudioBuffer = new InputAudioBuffer(this);
    this.#response = new Response(this);
  }

  get chatCtx(): llm.ChatContext | undefined {
    return this.#chatCtx;
  }

  get fncCtx(): llm.FunctionContext | undefined {
    return this.#fncCtx;
  }

  set fncCtx(ctx: llm.FunctionContext | undefined) {
    this.#fncCtx = ctx;
  }

  get conversation(): Conversation {
    return this.#conversation;
  }

  get inputAudioBuffer(): InputAudioBuffer {
    return this.#inputAudioBuffer;
  }

  get response(): Response {
    return this.#response;
  }

  get expiration(): number {
    return Date.now() + 3600 * 1000; // 1 hour
  }

  queueMsg(command: api_proto.ClientEvent): void {
    this.#sendQueue.put(command);
  }

  /** Create an empty audio message with the given duration. */
  #createEmptyUserAudioMessage(duration: number): llm.ChatMessage {
    const samples = duration * api_proto.SAMPLE_RATE;
    return new llm.ChatMessage({
      role: llm.ChatRole.USER,
      content: {
        frame: new AudioFrame(
          new Int16Array(samples * api_proto.NUM_CHANNELS),
          api_proto.SAMPLE_RATE,
          api_proto.NUM_CHANNELS,
          samples,
        ),
      },
    });
  }

  /**
   * Try to recover from a text response to audio mode.
   *
   * @remarks
   * Sometimes the OpenAI Realtime API returns text instead of audio responses.
   * This method tries to recover from this by requesting a new response after deleting the text
   * response and creating an empty user audio message.
   */
  recoverFromTextResponse(itemId: string) {
    if (itemId) {
      this.conversation.item.delete(itemId);
    }
    this.conversation.item.create(this.#createEmptyUserAudioMessage(1));
    this.response.create();
  }

  async start() {
    // Initialize AWS clients
    this.#bedrockClient = new BedrockRuntimeClient({
      region: this.#opts.region,
      credentials: {
        accessKeyId: this.#opts.accessKeyId || '',
        secretAccessKey: this.#opts.secretAccessKey || '',
      },
    });

    this.#logger.info({ bedrockClient: this.#bedrockClient }, 'bedrock client initialized');

    const response = await this.#bedrockClient.send(
      new InvokeModelWithBidirectionalStreamCommand({
        modelId: this.#opts.model,
        body: this.#inputStream(),
      }),
    );
    this.#logger.info({ bedrockClient: this.#bedrockClient, response }, 'Bidi stream command');
  }

  async *#inputStream(): AsyncIterable<InvokeModelWithBidirectionalStreamInput> {
    while (true) {
      try {
        const event = await this.#sendQueue.get();
        switch (event.type) {
          case 'input_audio_buffer.append':
            this.#logger.debug(`-> ${JSON.stringify(event)}`);
            yield {
              AudioEvent: {
                AudioChunk: event.audio,
              },
        if (event.type === 'input_audio_buffer.append') {
          this.#logger.debug(`-> ${JSON.stringify(event)}`);
          yield {
            AudioEvent: {
              AudioChunk: event.audio,
            },
          };
        }
      } catch (error) {
        this.#logger.error('Error sending event:', error);
      }
    }
  }

  async generateResponse(input: string): Promise<void> {
    if (!this.#bedrockClient) {
      throw new Error('Bedrock client not initialized');
    }

    try {
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: this.#opts.model,
        body: JSON.stringify({
          prompt: input,
          max_tokens: this.#opts.maxResponseOutputTokens,
          temperature: this.#opts.temperature,
        }),
      });

      const response = await this.#bedrockClient.send(command);
      if (response.body) {
        for await (const chunk of response.body) {
          if (chunk.chunk?.bytes) {
            const text = new TextDecoder().decode(chunk.chunk.bytes);
            this.emit('output', { text });
          }
        }
      }
    } catch (error) {
      this.#logger.error('Error generating response:', error);
      throw error;
    }
  }

  async close() {
    if (this.#bedrockClient) {
      this.#bedrockClient.destroy();
    }
  }
}
