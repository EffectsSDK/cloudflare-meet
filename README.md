# Welcome to Cloudflare Meet

(Cloudflare Meet was formerly known as Orange Meets)

Meet is a demo application built using [Cloudflare Realtime SFU](https://developers.cloudflare.com/realtime/). To build your own WebRTC application using Cloudflare Realtime, get started in the [Cloudflare Dashboard](https://dash.cloudflare.com/?to=/:account/realtime).

Simpler examples can be found [here](https://github.com/cloudflare/realtime-examples).

[Try the demo here!](https://demo.orange.cloudflare.dev)

![A screenshot showing a room in Meet](orange-meets.png)

## Architecture Diagram

![Diagram of Meet architecture](architecture.png)

## Variables

Go to the [Cloudflare Realtime dashboard](https://dash.cloudflare.com/?to=/:account/realtime) and create an application.

Put these variables into `.dev.vars`

```
CALLS_APP_ID=<APP_ID_GOES_HERE>
CALLS_APP_SECRET=<SECRET_GOES_HERE>
```

### Optional variables

The following variables are optional:

- `MAX_WEBCAM_BITRATE` (default `1200000`): the maximum bitrate for each meeting participant's webcam.
- `MAX_WEBCAM_FRAMERATE` (default: `24`): the maximum number of frames per second for each meeting participant's webcam.
- `MAX_WEBCAM_QUALITY_LEVEL` (default `1080`): the maximum resolution for each meeting participant's webcam, based on the smallest dimension (i.e. the default is 1080p).

To customize these variables, place replacement values in `.dev.vars` (for development) and in the `[vars]` section of `wrangler.toml` (for the deployment).

## Audio Effects SDK

Cloudflare Meet includes an optional integration with the [Audio Effects SDK](https://github.com/EffectsSDK/audio-effects-sdk-web). When configured, the existing `Suppress Noise` toggle in Settings uses Audio Effects SDK noise suppression for the microphone.

This is an integration sample that demonstrates only part of the Audio Effects SDK feature set. You can extend it to use additional SDK features. See https://effectssdk.ai for more details.

### Customer ID

Audio Effects SDK requires a Customer ID. Request one here:

- https://effectssdk.ai/cp/registration#audio

After you receive it, set it in your environment configuration:

```sh
AUDIO_EFFECTS_SDK_CUSTOMER_ID=<YOUR_CUSTOMER_ID>
```

Use `.dev.vars` for local development and the `[vars]` section of `wrangler.toml` for deployment.

### Defaults

Cloudflare Meet uses these Audio Effects SDK defaults:

- `preset: 'balanced'`
- `sample_rate: 32000`

### Optional overrides

If needed, you can also override these variables:

- `AUDIO_EFFECTS_SDK_PRESET`
- `AUDIO_EFFECTS_SDK_SAMPLE_RATE`
- `AUDIO_EFFECTS_SDK_URL`
- `AUDIO_EFFECTS_SDK_ORT_WASM_URL`
- `AUDIO_EFFECTS_SDK_ORT_WASM_SIMD_URL`

If these are not set, the integration uses the built-in defaults from Cloudflare Meet and the SDK package.

### Runtime behavior

The `Suppress Noise` toggle maps to the Audio Effects SDK lifecycle like this:

- enable noise suppression: pass the current mic stream into `sdk.useStream(...)`, wait for `onReady`, then call `sdk.run()`
- disable noise suppression: call `sdk.stop()`
- enable again without changing the stream: call `sdk.run()` again

### Verification

Open the browser console and look for `[AudioEffectsSDK]` logs. The integration logs:

- the payload sent to `sdk.config(...)`
- every `sdk.useStream(...)`
- `sdk.run()` and `sdk.stop()`
- all `sdk.onError(...)` callbacks

## Video Effects SDK

Cloudflare Meet includes an optional integration with the [Video Effects SDK](https://github.com/EffectsSDK/video-effects-sdk-web). When configured, Settings can use it for background blur, virtual backgrounds, beautification, and low-light correction.

This is an integration sample that demonstrates only part of the Video Effects SDK feature set. You can extend it to use additional SDK features. See https://effectssdk.ai for more details.

### Customer ID

Video Effects SDK requires its own Customer ID. It is separate from the Audio Effects SDK Customer ID. Request one here:

- https://effectssdk.ai/cp/registration

After you receive it, set it in your environment configuration:

```sh
VIDEO_EFFECTS_SDK_CUSTOMER_ID=<YOUR_VIDEO_CUSTOMER_ID>
```

Use `.dev.vars` for local development and the `[vars]` section of `wrangler.toml` for deployment.

### Defaults

Cloudflare Meet uses these Video Effects SDK defaults:

- `preset: 'balanced'`
- `provider: 'auto'`

### Optional overrides

If needed, you can also override these variables:

- `VIDEO_EFFECTS_SDK_PRESET`
- `VIDEO_EFFECTS_SDK_PROVIDER`
- `VIDEO_EFFECTS_SDK_URL`
- `VIDEO_EFFECTS_SDK_ORT_WASM_URL`
- `VIDEO_EFFECTS_SDK_ORT_WASM_SIMD_URL`
- `VIDEO_EFFECTS_SDK_ORT_WASM_THREADED_URL`
- `VIDEO_EFFECTS_SDK_ORT_WASM_SIMD_THREADED_URL`

If these are not set, the integration uses the built-in defaults from Cloudflare Meet and the SDK package.

### UI features

The Video Effects SDK integration is exposed through Settings with these controls:

- background blur with a `0..1` strength slider
- virtual background upload/select/delete
- beautification with a `0..1` strength slider
- low-light correction with a `0..1` strength slider

Virtual background assets are stored locally in the browser.

### Runtime behavior

The camera effects lifecycle maps to the Video Effects SDK like this:

- enable a video effect: pass the current camera stream into `sdk.useStream(...)`, wait for `onReady`, then call `sdk.run()`
- disable all video effects: call `sdk.stop()`
- enable again without changing the stream: call `sdk.run()` again
- effect sliders and background changes are applied to the singleton SDK instance without recreating it

### Verification

Open the browser console and look for `[VideoEffectsSDK]` logs. The integration logs:

- the payload sent to `sdk.config(...)`
- every `sdk.useStream(...)`
- `sdk.run()` and `sdk.stop()`
- all `sdk.onError(...)` callbacks

## Development

```sh
npm install
npm run dev
```

Open up [http://127.0.0.1:8787](http://127.0.0.1:8787) and you should be ready to go!

## Deployment

1. Make sure you've installed `wrangler` and are logged in by running:

```sh
wrangler login
```

2. Update `CALLS_APP_ID` in `wrangler.toml` to use your own Calls App ID

3. You will also need to set the token as a secret by running:

```sh
wrangler secret put CALLS_APP_SECRET
```

or to programmatically set the secret, run:

```sh
echo REPLACE_WITH_YOUR_SECRET | wrangler secret put CALLS_APP_SECRET
```

4. Optionally, you can also use [Cloudflare's TURN Service](https://developers.cloudflare.com/calls/turn/) by setting the `TURN_SERVICE_ID` variable in `wrangler.toml` and `TURN_SERVICE_TOKEN` secret using `wrangler secret put TURN_SERVICE_TOKEN`

5. Also optionally, you can include `OPENAI_MODEL_ENDPOINT` and `OPENAI_API_TOKEN` to use OpenAI's [Realtime API with WebRTC](https://platform.openai.com/docs/guides/realtime-webrtc) to [invite AI](https://www.youtube.com/watch?v=AzMpyAbZfZQ) to join your meeting.

6. Finally you can run the following to deploy:

```sh
npm run deploy
```
