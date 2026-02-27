const fs = require('fs');
fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(console.error);
