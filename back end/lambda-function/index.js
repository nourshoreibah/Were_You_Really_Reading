
// This Lambda function takes the URL and text content of any website and returns a 5 question multiple choice quiz (in JSON format)
// Include required modules
const OpenAI = require('openai');
const AWS = require('aws-sdk');

// Create OpenAI instance to use for API call
const openai = new OpenAI({
  apiKey: process.env.RUNPOD_API_KEY,// Use environment variable for API Key (for security)
  baseURL:'https://api.runpod.ai/v2/vllm-ba6dpoy24f6m8t/openai/v1'
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
  const prompt = `You will be given the contents of a web page. Create a multiple-choice quiz with 5 questions from the web content. Provide the output in the following JSON format: [{"Question": "Your question here","Choices": ["Option 1", "Option 2", "Option 3", "Option 4"],"Answer": "Correct option"}]. Do not include selectors such as "A.", "B.", "C.", or "D." in the options text. Ensure that there is only one correct answer, and that the "answer" field mathces the correct answer from the "options" field exactly. Make sure each question is different.`;

  
  console.log("web content: " + text)
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
      model: "nourshoreibah/phi3miniquizgen",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text }
      ],
      // I found this temperature is a good balance between creative questions and adherance to the correct JSON format
      temperature: 0.7,
      // Use OpenAI's new json response type to ensure response is a JSON 
      

    });
   
    console.log("GPT response: " + JSON.stringify(response))

   // Process GPT response into a variable
   console.log("Quiz: " + response.choices[0].message.content.trim().replace("<|end|>",""))
    const quiz = JSON.parse(response.choices[0].message.content.trim().replace("<|end|>",""));

  


    // Validate the quiz structure and then save it to DynamoDB for future use
    if (quiz && Array.isArray(quiz) && quiz[0].Question) {
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



