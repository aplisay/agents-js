// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0
import { AsyncIterableQueue, Future, Queue, llm, log, multimodal } from '@livekit/agents';
import { AudioFrame } from '@livekit/rtc-node';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import * as ultravox_proto from './api_proto.js';
import { UltravoxClient } from './ultravox_client.js';

interface ModelOptions {
  modalities: ['text', 'audio'] | ['text'];
  instructions: string;
  voice?: ultravox_proto.Voice;
  inputAudioFormat: ultravox_proto.AudioFormat;
  outputAudioFormat: ultravox_proto.AudioFormat;
  temperature: number;
  maxResponseOutputTokens: number;
  model: ultravox_proto.Model;
  apiKey: string;
  baseURL: string;
  maxDuration: string;
  timeExceededMessage: string;
  transcriptOptional: boolean;
  firstSpeaker: string;
}

export interface RealtimeResponse {
  id: string;
  status: 'completed' | 'failed' | 'cancelled';
  statusDetails: string | null;
  usage: null;
  output: RealtimeOutput[];
  doneFut: Future;
  createdTimestamp: number;
  firstTokenTimestamp?: number;
}

export interface RealtimeOutput {
  responseId: string;
  itemId: string;
  outputIndex: number;
  role: 'user' | 'assistant' | 'system';
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
  contentType: 'text' | 'audio';
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
    // Send audio frame to Ultravox WebSocket
    this.#session.sendAudioFrame(frame);
  }

  clear() {
    // Clear audio buffer - not needed for Ultravox
    console.debug('Audio buffer cleared');
  }

  commit() {
    // Commit audio buffer - not needed for Ultravox
    console.debug('Audio buffer committed');
  }
}

class ConversationItem {
  #session: RealtimeSession;
  #logger = log();

  constructor(session: RealtimeSession) {
    this.#session = session;
  }

  truncate(itemId: string, contentIndex: number, audioEnd: number) {
    // Not supported in Ultravox
    this.#logger.debug({ itemId, contentIndex, audioEnd }, 'Truncate not supported in Ultravox');
  }

  delete(itemId: string) {
    // Not supported in Ultravox
    this.#logger.debug({ itemId }, 'Delete not supported in Ultravox');
  }

  create(message: llm.ChatMessage, previousItemId?: string): void {
    if (!message.content) {
      return;
    }

    // For Ultravox, we handle messages through the WebSocket
    // This method is mainly for compatibility
    this.#logger.debug('Conversation item created', { message, previousItemId });
  }
}

class Conversation {
  #session: RealtimeSession;

  constructor(session: RealtimeSession) {
    this.#session = session;
  }

  get item(): ConversationItem {
    return new ConversationItem(this.#session);
  }
}

class Response {
  #session: RealtimeSession;

  constructor(session: RealtimeSession) {
    this.#session = session;
  }

  create() {
    // Not needed for Ultravox - responses are automatic
    console.debug('Response create called');
  }

  cancel() {
    // Not supported in Ultravox
    console.debug('Response cancel not supported in Ultravox');
  }
}

export class RealtimeModel extends multimodal.RealtimeModel {
  sampleRate = ultravox_proto.SAMPLE_RATE;
  numChannels = ultravox_proto.NUM_CHANNELS;
  inFrameSize = ultravox_proto.IN_FRAME_SIZE;
  outFrameSize = ultravox_proto.OUT_FRAME_SIZE;

  #defaultOpts: ModelOptions;
  #sessions: RealtimeSession[] = [];
  #client: UltravoxClient;

  constructor({
    modalities = ['text', 'audio'],
    instructions = '',
    voice,
    inputAudioFormat = 'pcm16',
    outputAudioFormat = 'pcm16',
    temperature = 0.8,
    maxResponseOutputTokens = Infinity,
    model = 'fixie-ai/ultravox-70B',
    apiKey = process.env.ULTRAVOX_API_KEY || '',
    baseURL = 'https://api.ultravox.ai/api/',
    maxDuration = '305s',
    timeExceededMessage = 'It has been great chatting with you, but we have exceeded our time now.',
    transcriptOptional = false,
    firstSpeaker = 'FIRST_SPEAKER_AGENT',
  }: {
    modalities?: ['text', 'audio'] | ['text'];
    instructions?: string;
    voice?: ultravox_proto.Voice;
    inputAudioFormat?: ultravox_proto.AudioFormat;
    outputAudioFormat?: ultravox_proto.AudioFormat;
    temperature?: number;
    maxResponseOutputTokens?: number;
    model?: ultravox_proto.Model;
    apiKey?: string;
    baseURL?: string;
    maxDuration?: string;
    timeExceededMessage?: string;
    transcriptOptional?: boolean;
    firstSpeaker?: string;
  }) {
    super();

    if (apiKey === '') {
      throw new Error(
        'Ultravox API key is required, either using the argument or by setting the ULTRAVOX_API_KEY environmental variable',
      );
    }

    this.#defaultOpts = {
      modalities,
      instructions,
      voice,
      inputAudioFormat,
      outputAudioFormat,
      temperature,
      maxResponseOutputTokens,
      model,
      apiKey,
      baseURL,
      maxDuration,
      timeExceededMessage,
      transcriptOptional,
      firstSpeaker,
    };

    this.#client = new UltravoxClient(apiKey, baseURL);
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
    temperature = this.#defaultOpts.temperature,
    maxResponseOutputTokens = this.#defaultOpts.maxResponseOutputTokens,
  }: {
    fncCtx?: llm.FunctionContext;
    chatCtx?: llm.ChatContext;
    modalities?: ['text', 'audio'] | ['text'];
    instructions?: string;
    voice?: ultravox_proto.Voice;
    inputAudioFormat?: ultravox_proto.AudioFormat;
    outputAudioFormat?: ultravox_proto.AudioFormat;
    temperature?: number;
    maxResponseOutputTokens?: number;
  }): RealtimeSession {
    const opts: ModelOptions = {
      modalities,
      instructions,
      voice,
      inputAudioFormat,
      outputAudioFormat,
      temperature,
      maxResponseOutputTokens,
      model: this.#defaultOpts.model,
      apiKey: this.#defaultOpts.apiKey,
      baseURL: this.#defaultOpts.baseURL,
      maxDuration: this.#defaultOpts.maxDuration,
      timeExceededMessage: this.#defaultOpts.timeExceededMessage,
      transcriptOptional: this.#defaultOpts.transcriptOptional,
      firstSpeaker: this.#defaultOpts.firstSpeaker,
    };

    const newSession = new RealtimeSession(opts, this.#client, {
      chatCtx: chatCtx || new llm.ChatContext(),
      fncCtx,
    });
    this.#sessions.push(newSession);
    return newSession;
  }

  async close() {
    await Promise.allSettled(this.#sessions.map((session) => session.close()));
  }
}

export class RealtimeSession extends multimodal.RealtimeSession {
  #chatCtx: llm.ChatContext | undefined = undefined;
  #fncCtx: llm.FunctionContext | undefined = undefined;
  #opts: ModelOptions;
  #client: UltravoxClient;
  #pendingResponses: { [id: string]: RealtimeResponse } = {};
  #sessionId = 'not-connected';
  #ws: WebSocket | null = null;
  #expiresAt: number | null = null;
  #logger = log();
  #task: Promise<void>;
  #closing = true;
  #sendQueue = new Queue<any>();
  #callId: string | null = null;

  constructor(
    opts: ModelOptions,
    client: UltravoxClient,
    { fncCtx, chatCtx }: { fncCtx?: llm.FunctionContext; chatCtx?: llm.ChatContext },
  ) {
    super();

    this.#opts = opts;
    this.#client = client;
    this.#chatCtx = chatCtx;
    this.#fncCtx = fncCtx;

    this.#task = this.#start();
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
    return new Conversation(this);
  }

  get inputAudioBuffer(): InputAudioBuffer {
    return new InputAudioBuffer(this);
  }

  get response(): Response {
    return new Response(this);
  }

  get expiration(): number {
    if (!this.#expiresAt) {
      throw new Error('session not started');
    }
    return this.#expiresAt * 1000;
  }

  queueMsg(command: any): void {
    this.#sendQueue.put(command);
  }

  sendAudioFrame(frame: AudioFrame): void {
    if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
      const audioData = Buffer.from(frame.data.buffer);
      this.#ws.send(audioData);
    }
  }

  #start(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Create Ultravox call
        const modelData: ultravox_proto.UltravoxModelData = {
          model: this.#opts.model,
          maxDuration: this.#opts.maxDuration,
          timeExceededMessage: this.#opts.timeExceededMessage,
          systemPrompt: this.#opts.instructions,
          selectedTools: [], // TODO: Convert functions to Ultravox tools
          temperature: this.#opts.temperature,
          voice: this.#opts.voice,
          transcriptOptional: this.#opts.transcriptOptional,
          medium: {
            serverWebSocket: {
              inputSampleRate: 48000,
              outputSampleRate: 48000,
              clientBufferSizeMs: 60,
            },
          },
          firstSpeaker: this.#opts.firstSpeaker,
        };
        console.log({ modelData }, 'modelData');
        this.#logger.debug({ modelData }, 'Creating Ultravox call');
        const callResponse = await this.#client.createCall(modelData);
        this.#callId = callResponse.callId;

        if (callResponse.ended || !callResponse.callId || !callResponse.joinUrl) {
          throw new Error('Failed to create Ultravox call');
        }

        // Connect to Ultravox WebSocket
        const joinUrl = new URL(callResponse.joinUrl);
        joinUrl.searchParams.append('experimentalMessages', 'debug');

        this.#logger.debug('Connecting to Ultravox WebSocket at', joinUrl.toString());
        this.#ws = new WebSocket(joinUrl.toString());

        this.#ws.onerror = (error) => {
          reject(new Error('Ultravox WebSocket error: ' + error.message));
        };

        await once(this.#ws, 'open');
        this.#closing = false;
        this.#sessionId = this.#callId;
        this.#expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

        this.#ws.onmessage = (message) => {
          try {
            if (message.data instanceof Buffer) {
              this.#handleAudio(message.data);
            } else {
              const event: ultravox_proto.UltravoxMessage = JSON.parse(message.data as string);
              this.#logger.debug(`<- ${JSON.stringify(event)}`);
              this.#handleMessage(event);
            }
          } catch (error) {
            let message;
            if (error instanceof Error) message = error.message;
            else message = String(error);
            this.#logger.error('Error parsing message:', message, error);
          }
        };

        const sendTask = async () => {
          while (this.#ws && !this.#closing && this.#ws.readyState === WebSocket.OPEN) {
            try {
              const event = await this.#sendQueue.get();
              this.#logger.debug(`-> ${JSON.stringify(event)}`);
              this.#ws.send(JSON.stringify(event));
            } catch (error) {
              this.#logger.error('Error sending event:', error);
            }
          }
        };

        sendTask();

        this.#ws.onclose = () => {
          if (this.#expiresAt && Date.now() >= this.#expiresAt) {
            this.#closing = true;
          }
          if (!this.#closing) {
            reject(new Error('Ultravox connection closed unexpectedly'));
          }
          this.#ws = null;
          resolve();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async close() {
    if (!this.#ws) return;
    this.#closing = true;
    this.#ws.close();
    if (this.#callId) {
      try {
        await this.#client.deleteCall(this.#callId);
      } catch (error) {
        this.#logger.error('Error deleting call:', error);
      }
    }
    await this.#task;
  }

  #handleMessage(event: ultravox_proto.UltravoxMessage): void {
    switch (event.type) {
      case 'status':
        this.#handleStatus(event);
        break;
      case 'transcripts':
        this.#handleTranscripts(event);
        break;
      case 'experimental_message':
        this.#handleExperimentalMessage(event);
        break;
      default:
        this.#logger.debug('Unknown message type:', (event as any).type);
    }
  }

  #handleStatus(event: ultravox_proto.UltravoxStatusMessage): void {
    this.#logger.debug('Status:', event.status);
  }

  #handleTranscripts(event: ultravox_proto.UltravoxTranscriptMessage): void {
    for (const transcript of event.transcripts) {
      if (transcript.speaker === 'user') {
        this.emit('input_speech_transcription_completed', {
          itemId: 'user-transcript',
          transcript: transcript.text,
        } as InputSpeechTranscriptionCompleted);
      } else if (transcript.speaker === 'agent') {
        // Handle agent transcript
        this.#logger.debug('Agent transcript:', transcript.text);
      }
    }
  }

  #handleExperimentalMessage(event: ultravox_proto.UltravoxExperimentalMessage): void {
    const message = event.message;
    if (message.type === 'debug' && message.message.startsWith('LLM response:')) {
      // Handle LLM response
      this.#logger.debug('LLM response:', message.message);
    }
  }

  async #handleAudio(audioData: Buffer): Promise<void> {
    // Handle incoming audio from Ultravox
    console.log(
      {
        audioData,
        length: audioData.length,
        sampleRate: ultravox_proto.SAMPLE_RATE,
        numChannels: ultravox_proto.NUM_CHANNELS,
      },
      'audioData',
    );
    new AudioFrame(
      new Int16Array(audioData),
      ultravox_proto.SAMPLE_RATE,
      ultravox_proto.NUM_CHANNELS,
      audioData.length / 2,
    );

    // Emit audio event
    this.emit('response_audio_delta', {
      response_id: 'ultravox-response',
      output_index: 0,
      content_index: 0,
      delta: audioData,
    });
  }

  /** Create an empty audio message with the given duration. */
  #createEmptyUserAudioMessage(duration: number): llm.ChatMessage {
    const samples = duration * ultravox_proto.SAMPLE_RATE;
    return new llm.ChatMessage({
      role: llm.ChatRole.USER,
      content: {
        frame: new AudioFrame(
          new Int16Array(samples * ultravox_proto.NUM_CHANNELS),
          ultravox_proto.SAMPLE_RATE,
          ultravox_proto.NUM_CHANNELS,
          samples,
        ),
      },
    });
  }

  /**
   * Try to recover from a text response to audio mode.
   *
   * @remarks
   * Sometimes the Ultravox API returns text instead of audio responses.
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
}
