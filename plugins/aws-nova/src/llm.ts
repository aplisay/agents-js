// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0
import {
  BedrockRuntimeClient,
  InvokeModelWithBidirectionalStreamCommand,
  InvokeModelWithBidirectionalStreamInput,
} from '@aws-sdk/client-bedrock-runtime';
import { llm } from '@livekit/agents';
import type { NovaModel } from './models.js';

export interface NovaOptions {
  model?: NovaModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

const defaultNovaOptions: NovaOptions = {
  model: 'nova-pro',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1,
  topK: 250,
  stopSequences: [],
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

export class NovaLLM extends llm.LLM {
  #opts: NovaOptions;
  #client: BedrockRuntimeClient;

  constructor(opts: Partial<NovaOptions> = defaultNovaOptions) {
    super();

    this.#opts = { ...defaultNovaOptions, ...opts };
    if (!this.#opts.region || !this.#opts.accessKeyId || !this.#opts.secretAccessKey) {
      throw new Error('AWS credentials are required (region, accessKeyId, secretAccessKey)');
    }

    this.#client = new BedrockRuntimeClient({
      region: this.#opts.region,
      credentials: {
        accessKeyId: this.#opts.accessKeyId,
        secretAccessKey: this.#opts.secretAccessKey,
      },
    });
  }

  chat({
    chatCtx,
    fncCtx,
    temperature,
    n,
    parallelToolCalls,
  }: {
    chatCtx: llm.ChatContext;
    fncCtx?: llm.FunctionContext;
    temperature?: number;
    n?: number;
    parallelToolCalls?: boolean;
  }): llm.LLMStream {
    return new NovaLLMStream(
      this,
      this.#client,
      chatCtx,
      fncCtx,
      this.#opts,
      parallelToolCalls,
      temperature,
      n,
    );
  }
}

export class NovaLLMStream extends llm.LLMStream {
  #llm: NovaLLM;
  #client: BedrockRuntimeClient;
  #chatCtx: llm.ChatContext;
  #fncCtx?: llm.FunctionContext;
  #opts: NovaOptions;
  #parallelToolCalls?: boolean;
  #temperature?: number;
  #n?: number;

  label = 'aws-nova.LLMStream';

  constructor(
    llm: NovaLLM,
    client: BedrockRuntimeClient,
    chatCtx: llm.ChatContext,
    fncCtx: llm.FunctionContext | undefined,
    opts: NovaOptions,
    parallelToolCalls?: boolean,
    temperature?: number,
    n?: number,
  ) {
    super(llm, chatCtx, fncCtx);
    this.#llm = llm;
    this.#client = client;
    this.#chatCtx = chatCtx;
    this.#fncCtx = fncCtx;
    this.#opts = opts;
    this.#parallelToolCalls = parallelToolCalls;
    this.#temperature = temperature;
    this.#n = n;
    this.#run();
  }

  async #run() {
    try {
      const messages = await this.#buildMessages();
      const stream = this.#createInputStream(messages);
      const command = new InvokeModelWithBidirectionalStreamCommand({
        modelId: this.#opts.model,
        body: stream,
      });

      const response = await this.#client.send(command);
      const outputStream = response.body;

      if (!outputStream) {
        throw new Error('No stream returned from AWS Bedrock');
      }

      for await (const chunk of outputStream) {
        if (chunk.chunk?.bytes) {
          const response = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes));
          if (response.event?.message?.content) {
            this.queue.put({
              requestId: response.id,
              choices: [
                {
                  delta: { content: response.event.message.content, role: llm.ChatRole.ASSISTANT },
                  index: 0,
                },
              ],
            });
          }
        }
      }
    } finally {
      this.queue.close();
    }
  }

  #createInputStream(messages: { role: string; content: string }[]): AsyncIterable<InvokeModelWithBidirectionalStreamInput> {
    const self = this;
    return {
      async *[Symbol.asyncIterator]() {
        // Send initialization event
        yield {
          chunk: {
            bytes: new TextEncoder().encode(JSON.stringify({
              event: {
                sessionStart: {
                  inferenceConfiguration: {
                    maxTokens: self.#opts.maxTokens,
                    topP: self.#opts.topP,
                    temperature: self.#temperature ?? self.#opts.temperature,
                  },
                },
              },
            })),
          },
        };

        // Send messages
        for (const msg of messages) {
          yield {
            chunk: {
              bytes: new TextEncoder().encode(JSON.stringify({
                event: {
                  message: {
                    role: msg.role,
                    content: msg.content,
                  },
                },
              })),
            },
          };
        }
      },
    };
  }

  async #buildMessages(): Promise<{ role: string; content: string }[]> {
    const messages: { role: string; content: string }[] = [];
    for (const msg of this.#chatCtx.messages) {
      if (typeof msg.content === 'string') {
        messages.push({
          role: msg.role.toString(),
          content: msg.content,
        });
      } else if (Array.isArray(msg.content)) {
        const content = msg.content
          .map((c) => (typeof c === 'string' ? c : ''))
          .filter(Boolean)
          .join('\n');
        if (content) {
          messages.push({
            role: msg.role.toString(),
            content,
          });
        }
      }
    }
    return messages;
  }
}
