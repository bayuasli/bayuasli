import axios from 'axios';

const API_URL = Buffer.from(
  'aHR0cHM6Ly9lbWFtLWFwaS10ZXN0LnZlcmNlbC5hcHAvaG9tZS9zZWN0aW9ucy9BaS9hcGkvcHJlbWl1bS9jaGF0',
  'base64'
).toString();

export async function premiumChat(q, options = {}) {
  try {
    const { data } = await axios.post(
      API_URL,
      {
        q: q,
        image: options.image || null,
        video: options.video || null,
        audio: options.audio || null,
        document: options.document || null,
        text2image: options.text2image || false,
        search: options.search || false,
        thinking: options.thinking || false
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );

    return data;
  } catch (err) {
    return {
      status: false,
      error: err.message
    };
  }
}