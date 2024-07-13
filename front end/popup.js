
document.addEventListener('DOMContentLoaded', () => {
    loadQuiz();
    
  });





chrome.storage.sync.get('start', (result) => {
    if(JSON.stringify(result)=="{}"){
        chrome.storage.sync.set({ start: document.body.innerHTML }, () => {
            console.log('Saved original page');
          });
    }
});


function reset(){
    chrome.storage.sync.get('start', (result) => {
        console.log(JSON.stringify(result));
        if(result.start){
            console.log("loading original page")
            
            document.body.innerHTML = result.start;
            document.body.style.width = '250px';
            document.body.style.height='180px';
            document.getElementById('generateQuiz').addEventListener('click', generateQuiz);
            unblurPage();
            chrome.storage.sync.set({ quizHtml: "" }, () => {
              console.log('Quiz cleared from storage');
              
            });

        }
    });
   
    
}
   
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

function addLoader(){
    document.getElementById("loaderHolder").innerHTML='<span class="loader"></span>';
}

function removeLoader(){
    document.getElementById("loaderHolder").innerHTML='';
   
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

function showAnswers(){
    document.getElementById('showanswercont').innerHTML = "";
            
    unblurPage();
    var answers = document.getElementsByClassName('answerdiv');
    for(i=0;i<answers.length;i++){
        answers[i].style.visibility='visible'
        answers[i].style.contentVisibility = 'visible';
    }
    saveQuizToStorage(document.body.innerHTML);
}

function makeShowButton(){
    const showButtonCont = document.createElement("div");
    showButtonCont.id = "showanswercont";
    showButtonCont.className = "buttons";
    const showButton = document.createElement("button");
    showButtonCont.appendChild(showButton);
    showButton.id = "showAnswers";
    showButton.innerHTML = "Show Answers"
    document.getElementById("buttonHolder").appendChild(showButtonCont);
    document.getElementById('showAnswers').addEventListener('click',showAnswers);
    
    // '<div id="showanswercont"><button id="showAnswers">Show Answers</button></div>'
}

function makeResetButton(){
    const resetButtonCont = document.createElement("div");
    resetButtonCont.id = "resetButtonHolder";
    resetButtonCont.className = "buttons";
    const resetButton = document.createElement("button");
    resetButtonCont.appendChild(resetButton);
    resetButton.id = "reset";
    resetButton.innerHTML = "Reset"
    document.getElementById("buttonHolder").appendChild(resetButtonCont);
    document.getElementById("reset").addEventListener('click',reset);

    

    //<div class = "buttons" id = "resetButtonHolder"> <button id="reset">Reset</button></div>
}




function generateQuiz(){
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractTextFromPage
        }, async (results) => {
          var text = results[0].result;
          cleanText = cleanString(text);
          if(false){
            const tooLong = document.createElement("p");
            tooLong.innerHTML ="Sorry. This website is too long.";
            document.getElementById("generateButtonHolder").appendChild(tooLong);
          }else{
          
          
          try {
            const textjson = {"url":tab.url,"text":cleanText};
            const quizHtml = await generateQuizFromText(textjson);
            const quizContainer = document.getElementById('quizContainer');
            quizContainer.innerHTML = quizHtml;

           makeShowButton();
           makeResetButton();

            
            blurPage();
            document.getElementById('generateButtonHolder').innerHTML="";
            document.body.style.height = '600px';
            document.body.style.width = '600px';
            saveQuizToStorage(document.body.innerHTML);
            
          } catch (error) {
            console.error('Error generating quiz:', error);
            const quizContainer = document.getElementById('quizContainer');
            quizContainer.innerHTML = `<p>Error generating quiz: ${error.message}</p>`;
          }
        }
        });
      });


}

document.getElementById('generateQuiz').addEventListener('click', generateQuiz);

  
  
  function extractTextFromPage() {
    return document.body.innerText;
  }


  
  async function generateQuizFromText(text) {
    console.log("input: "+ JSON.stringify(text))
    try {
      const response = await fetch('https://sk80cbi4q1.execute-api.us-east-1.amazonaws.com/prod/generateQuiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(text)
      });
      
  
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
  
      const responseBody = await response.text();
      console.log('Response body:', responseBody);
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${responseBody}`);
      }
//   const data = JSON.parse('{"quiz":{"questions":[{"question":"What is the practice and study of techniques for secure communication in the presence of adversaries called?","options":["Algorithm","Cryptography","Networking","Decryption"],"answer":"Cryptography"},{"question":"What are the two steps involved in sending a secure message?","options":["Encryption and Decryption","Encoding and Decoding","Transmission and Reception","Authentication and Authorization"],"answer":"Encryption and Decryption"},{"question":"What is the name of the application-layer protocol used in the assignment for encryption problems?","options":["Caesar Cipher","Vigenère Cipher","RSA Encryption","AES Encryption"],"answer":"Caesar Cipher"}]}}');
      const data = JSON.parse(responseBody);
      console.log('Parsed data:', data);
  
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
        document.getElementById("reset").addEventListener('click',reset);

      }
    });
  }
