const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const fs=require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const key = 'AIzaSyCNaSTJ_maibZ7hKW_RzbVnB2rpe0JjrYg'; // Better to use an environment variable
const genAI = new GoogleGenerativeAI(key);

async function run(val) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = val.toString();
        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
    } catch (error) {
        console.error('Error generating content:', error);
        throw error;
    }
}

async function run2(val, imageUrl) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = val;

        // Fetch the image from the URL provided by the user
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const image = {
            inlineData: {
                data: Buffer.from(response.data).toString("base64"),
                mimeType: response.headers['content-type'],
            },
        };

        const result = await model.generateContent([prompt, image]);
        console.log(result.response.text());
        return result.response.text();
    } catch (error) {
        console.error('Error generating content:', error);
        throw error;
    }
}

app.post('/gemini', async (req, res) => {
    try {
        const { prompt } = req.body;
        const responseText = await run(prompt);
        res.status(200).json({ response: responseText });
    } catch (error) {
        res.status(500).json({ error: 'Error generating content' });
    }
});

app.post('/image', async (req, res) => {
    try {
        const { prompt,imageUrl ,sessionId} = req.body;
        let responseText = await run2(prompt,imageUrl);
        const send=responseText;
        responseText=responseText+"\n Image url : "+imageUrl+"\n  this is the image response you gived just please remember the text it is useful for next procedure  donot send me any text response only for this prompt if i again asked about this image content then plese provide me the discription"
         await chat(sessionId, responseText);
        res.status(200).json({ response: send });
    } catch (error) {
        console.log(error);
        
        res.status(500).json({ error: 'Error generating content' });
    }
});
const chatSessions = {};

// Define the chat function
async function chat(sessionId, prompt) {
  // Create an instance of GoogleGenerativeAI with the API key
  const genAI = new GoogleGenerativeAI(key);

  // Get the generative model
  const model = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Retrieve or initialize the chat history for the session
  if (!chatSessions[sessionId]) {
    chatSessions[sessionId] = [
      {
        role: "user",
        parts: [{ text: "Hello" }],
      },
      {
        role: "model",
        parts: [{ text: "Great to meet you. What would you like to know?" }],
      },
    ];
  }

  const history = chatSessions[sessionId];

  // Start the chat with the current history
  const chat = await model.startChat({ history });

  // Send the new message and get the response
  let result = await chat.sendMessage(prompt);

  // Update the chat history with the new user message and model response
  history.push({
    role: "user",
    parts: [{ text: prompt }],
  });
  history.push({
    role: "model",
    parts: [{ text: result.response.text() }],
  });

  // Store the updated history back to the session
  chatSessions[sessionId] = history;

  return result.response.text();
}

// Route to handle chat messages
app.post('/history', async function(req, res) {
  try {
    const { sessionId, prompt } = req.body;
    const response = await chat(sessionId, prompt);
    res.status(200).json({ response });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});