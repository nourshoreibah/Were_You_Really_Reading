
// This Lambda function takes the URL and text content of any website and returns a 5 question multiple choice quiz (in JSON format)
// Include required modules
const OpenAI = require('openai');
const AWS = require('aws-sdk');

// Create OpenAI instance to use for API call
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Use environment variable for API Key (for security)
});

// Create DynnamoDB DocumentClient instnce to interact with database
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Start of handler (the "main" of an AWS Lambda function)
exports.handler = async (event) => {
  // Declare variable for JSON payload
  let body;

  // Try to parse the JSON payload, return an error if JSON is invalid
  try {
    
    body = JSON.parse(event.body); 
  
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

  // Extract website url and text from parsed payload
  const {url,text} = body;

  // The prompt that will be sent to OpenAI API
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

// Try scope for quiz generation
 try {
  // Check if a quiz for this website has been generated before and is in the No-SQL database
  const existingQuiz = await getQuizFromDynamoDB(url);
  if (existingQuiz) {
    // Return the quiz if it exists
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
    // Call OpenAI API to generate a new quiz if quiz does not exist
    // Note: I am currently working on fine-tuning an open LLM to replace GPT 3.5, decreasing costs. This will be deployed to Lambda using the llama.cpp library and Docker
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt }
      ],
      // I found this temperature is a good balance between creative questions and adherance to the correct JSON format
      temperature: 0.7,
      // Use OpenAI's new json response type to ensure response is a JSON 
      response_format: { type: "json_object" }

    });
   
    console.log("GPT response: " + JSON.stringify(response))

   // Process GPT response into a variable
    const quiz = JSON.parse(response.choices[0].message.content.trim());


    // Validate the quiz structure and then save it to DynamoDB for future use
    if (quiz && quiz.questions && Array.isArray(quiz.questions)) {
      await saveQuizToDynamoDB(url, quiz);
      // Return quiz
      return {
        statusCode: 200,
        body: JSON.stringify({ quiz: quiz }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    } else {
      // Throw an invalid format error if quiz structure not valid
      throw new Error('Invalid quiz format');
    }
   // Catch any other error and return it
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

// function to get existing quizzes. Returns null if quiz was not found
async function getQuizFromDynamoDB(url) {
  const params = {
    TableName: 'WebsitesQuizzes',
    Key: { url: url }
  };
  
  try {
    // Get associated quiz for url
    const result = await dynamoDB.get(params).promise();
    // Use ternary operator to return the quiz if it exists or null otherwize
    return result.Item ? result.Item.quiz : null;
    // Return null if any error occures and log the error
  } catch (error) {
    console.error('Error getting quiz from DynamoDB:', error);
    return null;
  }
}

// function to save urls and their corresponding quizzes to DynamoDB
async function saveQuizToDynamoDB(url, quiz) {
  // Declare required parameters for DynamoDB
  const params = {
    TableName: 'WebsitesQuizzes',
    Item: {
      url: url,
      quiz: quiz
    }
  };
  
  try {
    // Save quiz to DynamoDB
    await dynamoDB.put(params).promise();
    console.log('Quiz saved to DynamoDB');
    
  } catch (error) {
    // Log an error if saving fails
    console.error('Error saving quiz to DynamoDB:', error);
  }
}



