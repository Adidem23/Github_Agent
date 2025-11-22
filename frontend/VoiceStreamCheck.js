import axios from "axios"

const url = 'https://global.api.murf.ai/v1/speech/stream';
      const data = {
        "voiceId": "en-US-matthew",
        "text":"ReplyText",
        "multiNativeLocale": "en-US",
        "model": "FALCON",
        "format": "MP3",
        "sampleRate": 24000,
        "channelType": "MONO"
      };

      const config = {
        method: 'post',
        url: url,
        headers: {
          'Content-Type': 'application/json',
          'api-key': 'ap2_e9308d91-4bbd-4cbc-9fca-a750e527c937'
        },
        data: data,
        responseType: 'stream'
      };

      axios(config)
        .then((response) => {
          response.data.on('data', (chunk) => {
            console.log('Received audio chunk:', chunk.length, 'bytes');
          });

          response.data.on('end', () => {
            console.log('Stream ended');
          });
        })
        .catch((error) => {
          console.log(error);
        });