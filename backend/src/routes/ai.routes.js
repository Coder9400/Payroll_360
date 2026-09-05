const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

router.post('/generate-leave', (req, res) => {
  const scriptPath = path.join(__dirname, '../scripts/hf_generate.py');
  const pythonProcess = spawn('python', [scriptPath]);
  
  let output = '';
  let errorOutput = '';
  
  pythonProcess.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  pythonProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });
  
  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      console.error('Python script error:', errorOutput);
      return res.status(500).json({ success: false, error: 'AI generation failed' });
    }
    
    try {
      const result = JSON.parse(output);
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (e) {
      console.error('Failed to parse python output:', output);
      res.status(500).json({ success: false, error: 'Invalid response from AI service' });
    }
  });

  // Send JSON input to python script via stdin
  pythonProcess.stdin.write(JSON.stringify(req.body));
  pythonProcess.stdin.end();
});

module.exports = router;
