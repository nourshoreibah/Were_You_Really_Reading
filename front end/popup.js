
document.addEventListener('DOMContentLoaded', () => {
    loadQuiz();
    
  });





chrome.storage.local.get('start', (result) => {
    if(JSON.stringify(result)=="{}"){
        chrome.storage.local.set({ start: document.body.innerHTML }, () => {
            console.log('Saved original page');
          });
    }
});


function reset(){
    chrome.storage.local.get('start', (result) => {
        console.log(JSON.stringify(result));
        if(result.start){
            console.log("loading original page")
            
            document.body.innerHTML = result.start;
            document.body.style.width = '250px';
            document.body.style.height='180px';
            document.getElementById('generateQuiz').addEventListener('click', generateQuiz);
            unblurPage();
            chrome.storage.local.set({ quizHtml: "" }, () => {
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
    const letters = ["a","b","c","d"];
    const answers = document.getElementsByClassName('answerdiv');
    var correct = 0;
    for(let i=0;i<answers.length;i++){
        const selected = document.querySelector(`input[name="q${i+1}"]:checked`);  
        const options = document.getElementsByClassName(`q${i}`);
        for(let j =0;j<options.length;j++){
          if (options[j].classList.contains("correct")){
            if(options[j].checked){
              correct+=1;
            }
            document.getElementById(`q${i}${letters[j]}L`).innerHTML+=" ✅ ";
          }else{
            document.getElementById(`q${i}${letters[j]}L`).innerHTML+=" ❌ ";
           }
           if(options[j].checked){
            document.getElementById(`q${i}${letters[j]}L`).innerHTML+=` <-- Your Answer`;

           }

        }
        answers[i].style.visibility='visible';
        answers[i].style.contentVisibility = 'visible';
    }
    disableRadioButtons();
    let percent = Math.round((correct/answers.length)*100);
    document.getElementById('quizContainer').innerHTML+=`<div id = "piecontainer"><div class="pie animate" style="--p:${percent};--c:orange;"> ${percent}%</div></div>`;
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    saveQuizToStorage(document.body.innerHTML);
    saveRadioState();
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
            attachRadioListeners();

           makeShowButton();
           makeResetButton();

            
            blurPage();
            document.getElementById('generateButtonHolder').innerHTML="";
            document.body.style.height = '600px';
            document.body.style.width = '600px';
            document.getElementById("logodiv").innerHTML = `<img id = "longlogo" src = "images/longlogo.png"></img>`
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
      
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${responseBody}`);
      }
//   const data = JSON.parse('{"quiz":{"questions":[{"question":"What is the practice and study of techniques for secure communication in the presence of adversaries called?","options":["Algorithm","Cryptography","Networking","Decryption"],"answer":"Cryptography"},{"question":"What are the two steps involved in sending a secure message?","options":["Encryption and Decryption","Encoding and Decoding","Transmission and Reception","Authentication and Authorization"],"answer":"Encryption and Decryption"},{"question":"What is the name of the application-layer protocol used in the assignment for encryption problems?","options":["Caesar Cipher","Vigenère Cipher","RSA Encryption","AES Encryption"],"answer":"Caesar Cipher"}]}}');
      const data = JSON.parse(responseBody);
      
  
      if (data.error) {
        throw new Error(data.error);
      }
  
     

      const questions = data.quiz.questions;
      let outputHTML = "";
      console.log(JSON.stringify(questions));

      for(let i = 0; i < questions.length; i++) {
        
        outputHTML+=`
        <div class = "questiondiv">
          <p>Question ${i+1}: ${questions[i].question}</p>

          <div class = "option">
          <input type="radio" class = "q${i} ${((questions[i].options[0] == questions[i].answer) ? 'correct' : 'incorrect')}" id="q${i}a" name="q${i+1}" value="${questions[i].options[0]}"><br>
          <label id="q${i}aL" for="q${i}a">a. ${questions[i].options[0]}</label>
          </div>

          <div class = "option">
          <input type="radio" class = "q${i} ${((questions[i].options[1] == questions[i].answer) ? 'correct' : 'incorrect')}" id="q${i}b" name="q${i+1}" value="${questions[i].options[1]}"><br>
          <label id="q${i}bL" for="q${i}b">b. ${questions[i].options[1]}</label>
          </div>

          <div class = "option">
          <input type="radio" class = "q${i} ${((questions[i].options[2] == questions[i].answer) ? 'correct' : 'incorrect')}" id="q${i}c" name="q${i+1}" value="${questions[i].options[2]}"><br>
          <label id="q${i}cL" for="q${i}c">c. ${questions[i].options[2]}</label>
          </div>

          <div class ="option">
          <input type="radio" class = "q${i} ${((questions[i].options[3] == questions[i].answer) ? 'correct' : 'incorrect')}" id="q${i}d" name="q${i+1}" value="${questions[i].options[3]}"><br>
          <label id="q${i}dL" for="q${i}d">d. ${questions[i].options[3]}</label>
          </div>
        
        <div class = "answerdiv" id = "answer${i}">
            <p>Answer: ${questions[i].answer}</p>
        </div>
        </div>
        <hr>

      `
      
      
    }
    

   

    
  
      return outputHTML;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
    
  }

  function saveRadioState() {
    const radioState = {};
    const radios = document.querySelectorAll('input[type=radio]');
    radios.forEach(radio => {
      if (radio.checked) {
        radioState[radio.name] = radio.value;
      }
    });
    chrome.storage.local.set({ radioState: radioState }, () => {
      console.log('Radio state saved.');
    });
  }

  function loadRadioState() {
    chrome.storage.local.get('radioState', (result) => {
      if (result.radioState) {
        const radioState = result.radioState;
        Object.keys(radioState).forEach(name => {
          const radio = document.querySelector(`input[name="${name}"][value="${radioState[name]}"]`);
          if (radio) {
            radio.checked = true;
          }
        });
      }
    });
  }

  function attachRadioListeners() {
    const radios = document.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
      console.log('adding radio listener');
      radio.addEventListener('change', saveRadioState)
    });
  }

  function disableRadioButtons(){
    const radios = document.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
      radio.disabled = true;
    });

  }

  function saveQuizToStorage(quizHtml) {
    chrome.storage.local.set({ quizHtml: quizHtml }, () => {
      console.log('Quiz saved to storage.');
      console.log(quizHtml);
    });

  }

  function loadQuiz() {
    chrome.storage.local.get('quizHtml', (result) => {
      if (result.quizHtml) {
        console.log("loading past document")
        document.body.innerHTML = result.quizHtml;
        document.body.style.height = '600px';
        document.body.style.width = '600px';
        if(document.getElementById("showAnswers")){
            document.getElementById('showAnswers').addEventListener('click',showAnswers);
        }
        document.getElementById("reset").addEventListener('click',reset);
        loadRadioState();
        attachRadioListeners();

      }
    });
    
  }
