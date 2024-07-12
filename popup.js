
document.addEventListener('DOMContentLoaded', () => {
    loadQuiz();
    
  });
   
chrome.runtime.connect({ name: "popup" });
function cleanString(inputString){
    
    let result="";
    for(i = 0;i<inputString.length;i++){
        if (/[a-zA-Z0-9 .]/.test(inputString[i])){
            result+=inputString[i];
        }
    }
    return result;
    

}

function unblurPage(){
    chrome.tabs.query({active:true,currentWindow:true},(tabs)=>{
        chrome.scripting.executeScript({
            target:{tabId:tabs[0].id},
            func:()=>document.body.style.filter="none"

        })

    }
    
    )
}


function blurPage(){
    chrome.tabs.query({active:true,currentWindow:true},(tabs)=>{
        chrome.scripting.executeScript({
            target:{tabId:tabs[0].id},
            func:()=>document.body.style.filter="blur(3px)"

        })

    }
    
    )
}


document.getElementById('generateQuiz').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: extractTextFromPage
      }, async (results) => {
        var text = results[0].result;
        cleanText = cleanString(text);
        try {
          var textjson = {"text":cleanText}
          const quizHtml = await generateQuizFromText(textjson);
          const quizContainer = document.getElementById('quizContainer');
          quizContainer.innerHTML = quizHtml;
          
          
          blurPage();
          document.getElementById('buttonHolder').innerHTML="";
          document.body.style.height = '600px';
          document.body.style.width = '600px';
          saveQuizToStorage(document.body.innerHTML);
          document.getElementById('showAnswers').addEventListener('click',()=>{
            document.getElementById('showanswercont').innerHTML = "";
            
            unblurPage();
            var answers = document.getElementsByClassName('answerdiv');
            for(i=0;i<answers.length;i++){
                answers[i].style.visibility='visible'
                answers[i].style.contentVisibility = 'visible';
            }
            saveQuizToStorage(document.body.innerHTML);
          });
        } catch (error) {
          console.error('Error generating quiz:', error);
          const quizContainer = document.getElementById('quizContainer');
          quizContainer.innerHTML = `<p>Error generating quiz: ${error.message}</p>`;
        }
      });
    });
  });

  
  
  function extractTextFromPage() {
    return document.body.innerText;
  }


  
  async function generateQuizFromText(text) {
    console.log("input: "+ JSON.stringify(text))
    try {
    //   const response = await fetch('https://sk80cbi4q1.execute-api.us-east-1.amazonaws.com/prod/generateQuiz', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(text)
    //   });
      
  
    //   console.log('Response status:', response.status);
    //   console.log('Response headers:', response.headers);
  
    //   const responseBody = await response.text();
    //   console.log('Response body:', responseBody);
  
    //   if (!response.ok) {
    //     throw new Error(`HTTP error! Status: ${response.status}, Message: ${responseBody}`);
    //   }
  const data = JSON.parse('{"quiz":{"questions":[{"question":"What is the practice and study of techniques for secure communication in the presence of adversaries called?","options":["Algorithm","Cryptography","Networking","Decryption"],"answer":"Cryptography"},{"question":"What are the two steps involved in sending a secure message?","options":["Encryption and Decryption","Encoding and Decoding","Transmission and Reception","Authentication and Authorization"],"answer":"Encryption and Decryption"},{"question":"What is the name of the application-layer protocol used in the assignment for encryption problems?","options":["Caesar Cipher","Vigenère Cipher","RSA Encryption","AES Encryption"],"answer":"Caesar Cipher"}]}}');
    //   const data = JSON.parse(responseBody);
    //   console.log('Parsed data:', data);
  
      if (data.error) {
        throw new Error(data.error);
      }
  
     

      const questions = data.quiz.questions;
      let outputHTML = "";

      for(let i = 0; i < questions.length; i++) {
        
        outputHTML+=`
        <div class = "questiondiv">
          <p>Question ${i+1}: ${questions[i].question}</p>
          <input type="radio" name="q${i+1}" value="a"> a. ${questions[i].options[0]}<br>
          <input type="radio" name="q${i+1}" value="b"> b. ${questions[i].options[1]}<br>
          <input type="radio" name="q${i+1}" value="c"> c. ${questions[i].options[2]}<br>
          <input type="radio" name="q${i+1}" value="d"> d. ${questions[i].options[3]}<br>
        
        <div class = "answerdiv">
            <p>Answer: ${questions[i].answer}</p><br>
        </div>
        </div>

      `
      
    }

    outputHTML+= '<div id="showanswercont"><button id="showAnswers">Show Answers</button></div>'

    
  
      return outputHTML;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
    
  }

  function saveQuizToStorage(quizHtml) {
    chrome.storage.sync.set({ quizHtml: quizHtml }, () => {
      console.log('Quiz saved to storage.');
      console.log(quizHtml);
    });

  }

  function loadQuiz() {
    chrome.storage.sync.get('quizHtml', (result) => {
      if (result.quizHtml) {
        console.log("loading past document")
        document.body.innerHTML = result.quizHtml;
        document.body.style.height = '600px';
        document.body.style.width = '600px';
        if(document.getElementById("showAnswers")){
            document.getElementById('showAnswers').addEventListener('click',()=>{
                document.getElementById('showanswercont').innerHTML = "";
                
                unblurPage();
                var answers = document.getElementsByClassName('answerdiv');
                for(i=0;i<answers.length;i++){
                    answers[i].style.visibility='visible'
                    answers[i].style.contentVisibility = 'visible';
                }
                saveQuizToStorage(document.body.innerHTML);
              });
        }
      }
    });
  }
