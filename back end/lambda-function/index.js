

const OpenAI = require('openai');
const AWS = require('aws-sdk');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Use environment variable for the API key
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  let body;

  try {
    
    body = JSON.parse(event.body); // Parse the JSON payload
  
    

  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }

  const {url,text} = body;


  const prompt = `Create a multiple-choice quiz with 5-10 questions from the content of this website. Provide the output in the following JSON format:

  {
    "questions": [
      {
        "question": "Your question here",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "answer": "Correct option"
      }
    ]
  }

  Do not include selectors such as "A.", "B.", "C.", or "D." in the options text. Ensure that there is only one correct answer, and that the "answer" field mathces the correct answer from the "options" field exactly. Do not ask repeat questions.

  Here is the website: "${text}"`;

  console.log("prompt: " + prompt);

 try {
  const existingQuiz = await getQuizFromDynamoDB(url);
  if (existingQuiz) {
    console.log('Quiz retrieved from DynamoDB:', existingQuiz);
    return {
      statusCode: 200,
      body: JSON.stringify({ quiz: existingQuiz }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }

    });

    console.log("GPT response: " + JSON.stringify(response))

    const quiz = JSON.parse(response.choices[0].message.content.trim());


    // Validate the quiz structure
    if (quiz && quiz.questions && Array.isArray(quiz.questions)) {
      await saveQuizToDynamoDB(url, quiz);
      return {
        statusCode: 200,
        body: JSON.stringify({ quiz: quiz }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    } else {
      throw new Error('Invalid quiz format');
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.toString() }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};

async function getQuizFromDynamoDB(url) {
  const params = {
    TableName: 'WebsitesQuizzes',
    Key: { url: url }
  };
  
  try {
    const result = await dynamoDB.get(params).promise();
    return result.Item ? result.Item.quiz : null;
  } catch (error) {
    console.error('Error getting quiz from DynamoDB:', error);
    return null;
  }
}

async function saveQuizToDynamoDB(url, quiz) {
  const params = {
    TableName: 'WebsitesQuizzes',
    Item: {
      url: url,
      quiz: quiz
    }
  };
  
  try {
    await dynamoDB.put(params).promise();
    console.log('Quiz saved to DynamoDB');
  } catch (error) {
    console.error('Error saving quiz to DynamoDB:', error);
  }
}



