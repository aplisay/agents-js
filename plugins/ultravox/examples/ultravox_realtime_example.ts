// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0

import { RealtimeModel } from '../src/realtime/realtime_model.js';
import { AudioFrame } from '@livekit/rtc-node';
import { ultravox_proto } from '../src/realtime/ultravox_api_proto.js';

async function main() {
  // Create Ultravox realtime model
  const model = new RealtimeModel({
    apiKey: process.env.ULTRAVOX_API_KEY || '',
    model: 'fixie-ai/ultravox-70B',
    instructions: 'You are a helpful AI assistant. Respond naturally in conversation.',
    voice: 'alloy',
    temperature: 0.8,
    maxDuration: '60s',
  });

  // Create a session
  const session = model.session({
    chatCtx: undefined,
    fncCtx: undefined,
  });

  // Listen for events
  session.on('input_speech_transcription_completed', (event) => {
    console.log('User said:', event.transcript);
  });

  session.on('response_audio_delta', (event) => {
    console.log('Received audio response');
  });

  // Send audio frames (example)
  const sampleRate = ultravox_proto.SAMPLE_RATE;
  const numChannels = ultravox_proto.NUM_CHANNELS;
  const frameSize = ultravox_proto.IN_FRAME_SIZE;

  // Create a silent audio frame as an example
  const silentFrame = new AudioFrame(
    new Int16Array(frameSize * numChannels),
    sampleRate,
    numChannels,
    frameSize,
  );

  // Send audio to Ultravox
  session.inputAudioBuffer.append(silentFrame);

  // Wait for some time to see responses
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Clean up
  await session.close();
  await model.close();
}

main().catch(console.error); 