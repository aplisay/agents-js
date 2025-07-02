// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0

// Ultravox API constants
export const SAMPLE_RATE = 48000;
export const NUM_CHANNELS = 1;
export const IN_FRAME_SIZE = 480; // 10ms at 48kHz
export const OUT_FRAME_SIZE = 480; // 10ms at 48kHz

// Ultravox API types
export type Voice = string;
export type AudioFormat = 'pcm16';
export type Model = string;

export interface UltravoxTool {
  nameOverride: string;
  temporaryTool: {
    description: string;
    timeout: string;
    http?: {
      baseUrlPattern: string;
      httpMethod: string;
    };
    client?: Record<string, unknown>;
    dynamicParameters?: Array<{
      name: string;
      location: string;
      schema: {
        type: string;
        description: string;
      };
      required: boolean;
    }>;
    staticParameters?: Array<{
      name: string;
      location: string;
      value: string;
    }>;
    requirements?: {
      httpSecurityOptions: {
        options: Array<{
          requirements: Record<string, unknown>;
        }>;
      };
    };
  };
  authTokens?: Record<string, string>;
}

export interface UltravoxModelData {
  model: string;
  maxDuration: string;
  timeExceededMessage: string;
  systemPrompt: string;
  selectedTools: UltravoxTool[];
  temperature?: number;
  voice?: string;
  transcriptOptional: boolean;
  medium?: {
    serverWebSocket: {
      inputSampleRate: number;
      outputSampleRate: number;
      clientBufferSizeMs: number;
    };
  };
  firstSpeaker?: string;
}

// Ultravox WebSocket message types
export type UltravoxMessageType = 'status' | 'transcripts' | 'experimental_message' | 'audio';

export interface UltravoxStatusMessage {
  type: 'status';
  status: string;
}

export interface UltravoxTranscriptMessage {
  type: 'transcripts';
  transcripts: Array<{
    speaker: string;
    text: string;
    final: boolean;
  }>;
}

export interface UltravoxExperimentalMessage {
  type: 'experimental_message';
  message: {
    type: string;
    message: string;
  };
}

export interface UltravoxAudioMessage {
  type: 'audio';
  audio: string; // base64 encoded audio data
}

export type UltravoxMessage =
  | UltravoxStatusMessage
  | UltravoxTranscriptMessage
  | UltravoxExperimentalMessage
  | UltravoxAudioMessage;

// Ultravox API response types
export interface UltravoxCallResponse {
  callId: string;
  ended: boolean;
  joinUrl: string;
}

export interface UltravoxVoice {
  name: string;
  description: string;
}

export interface UltravoxVoicesResponse {
  results: UltravoxVoice[];
}
