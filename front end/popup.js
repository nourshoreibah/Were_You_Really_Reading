// This event listener runs the loadQuiz() function once the DOM content is loaded. The purpose of this is to maintain the state of the popup window even if the user closes and opens it.
document.addEventListener('DOMContentLoaded', () => {
    loadQuiz();
    
  });




// If it has not previouslt been saved, the popup will save its original state (to be used when the user presses reset) 
chrome.storage.local.get('start', (result) => {
    if(JSON.stringify(result)=="{}"){
        chrome.storage.local.set({ start: document.body.innerHTML }, () => {
            console.log('Saved original page');
          });
    }
});

// This function resets the popup to its original state using the backup stored above
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

// This function reduces the number of tokens in the web content to increase effeciency. It removes any non alphanumerical characters other than space and period
function cleanString(inputString){
    
    let result="";
    for(i = 0;i<inputString.length;i++){
        if (/[a-zA-Z0-9 .]/.test(inputString[i])){
            result+=inputString[i];
        }
    }
    return result;
}

// This function unblurs the page the website is loking at
function unblurPage(){
    chrome.tabs.query({active:true,currentWindow:true},(tabs)=>{
        chrome.scripting.executeScript({
            target:{tabId:tabs[0].id},
            func:()=>document.body.style.filter="none"

        })

    }
    
    )
}

// This function blurs the page the website is looking at
function blurPage(){
    chrome.tabs.query({active:true,currentWindow:true},(tabs)=>{
        chrome.scripting.executeScript({
            target:{tabId:tabs[0].id},
            func:()=>document.body.style.filter="blur(3px)"

        })

    }
    
    )
}

// This function reveals the answers for each question and scores the quiz
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

// This function creates the show answers button that is used to reveal answers and score quiz
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

// THis function creates the reset button which returns the popup to its original state whnen pressed
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



// This function generates the quiz by making an API call to AWS lambda
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

  
  // This function extracts the text from the current page
  function extractTextFromPage() {
    return document.body.innerText;
  }


  // This helper function for generate quiz takes the filtered web content and makes the Lambda API call. It then returns the quiz in HTML format.
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
      

      console.log("Response: " + responseBody)
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${responseBody}`);
      }

      
//   const data = JSON.parse('{"quiz":{"questions":[{"question":"What is the practice and study of techniques for secure communication in the presence of adversaries called?","options":["Algorithm","Cryptography","Networking","Decryption"],"answer":"Cryptography"},{"question":"What are the two steps involved in sending a secure message?","options":["Encryption and Decryption","Encoding and Decoding","Transmission and Reception","Authentication and Authorization"],"answer":"Encryption and Decryption"},{"question":"What is the name of the application-layer protocol used in the assignment for encryption problems?","options":["Caesar Cipher","Vigenère Cipher","RSA Encryption","AES Encryption"],"answer":"Caesar Cipher"}]}}');
      const data = JSON.parse(responseBody);
      
  
      if (data.error) {
        throw new Error(data.error);
      }
  
     

      const questions = data.quiz;
      let outputHTML = "";
      console.log(JSON.stringify(questions));

      for(let i = 0; i < questions.length; i++) {
        
        outputHTML+=`
        <div class = "questiondiv">
          <p>Question ${i+1}: ${questions[i].Question}</p>

          <div class = "option">
          <input type="radio" class = "q${i} ${((questions[i].Choices[0] == questions[i].Answer) ? 'correct' : 'incorrect')}" id="q${i}a" name="q${i+1}" value="${questions[i].Choices[0]}"><br>
          <label id="q${i}aL" for="q${i}a">a. ${questions[i].Choices[0]}</label>
          </div>

          <div class = "option">
          <input type="radio" class = "q${i} ${((questions[i].Choices[1] == questions[i].Answer) ? 'correct' : 'incorrect')}" id="q${i}b" name="q${i+1}" value="${questions[i].Choices[1]}"><br>
          <label id="q${i}bL" for="q${i}b">b. ${questions[i].Choices[1]}</label>
          </div>

          <div class = "option">
          <input type="radio" class = "q${i} ${((questions[i].Choices[2] == questions[i].Answer) ? 'correct' : 'incorrect')}" id="q${i}c" name="q${i+1}" value="${questions[i].Choices[2]}"><br>
          <label id="q${i}cL" for="q${i}c">c. ${questions[i].Choices[2]}</label>
          </div>

          <div class ="option">
          <input type="radio" class = "q${i} ${((questions[i].Choices[3] == questions[i].Answer) ? 'correct' : 'incorrect')}" id="q${i}d" name="q${i+1}" value="${questions[i].Choices[3]}"><br>
          <label id="q${i}dL" for="q${i}d">d. ${questions[i].Choices[3]}</label>
          </div>
        
        <div class = "answerdiv" id = "answer${i}">
            <p>Answer: ${questions[i].Answer}</p>
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

// This function saves the state of each radio button, ensuring the user's responses are not lost after closing the popup. 
// The states of radio buttons are not part of the HTML text, so their states need to be saved seperately
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

// This function attaches listeners to each radio button so that radio state is saved everytime a change is made
// Note event listeners must be reloaded everytime the popup is closed and reopened
  function attachRadioListeners() {
    const radios = document.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
      console.log('adding radio listener');
      radio.addEventListener('change', saveRadioState)
    });
  }

// This function disables the radio buttons and is called once the user presses show answers
  function disableRadioButtons(){
    const radios = document.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
      radio.disabled = true;
    });

  }

// This function saves the popup's HTML text to Chrome storage
  function saveQuizToStorage(quizHtml) {
    chrome.storage.local.set({ quizHtml: quizHtml }, () => {
      console.log('Quiz saved to storage.');
      console.log(quizHtml);
    });

  }

// This function loads the popup's HTML content from Chrome storage if it exists and restores event listeners, radio button state, and popup dimensions
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
