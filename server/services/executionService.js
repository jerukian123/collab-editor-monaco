const axios = require('axios');

const PISTON_API_URL = 'https://emkc.org/api/v2/piston';

// Language mapping from Monaco to Piston
const LANGUAGE_MAP = {
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  python: { language: 'python', version: '3.10.0' },
  java: { language: 'java', version: '15.0.2' },
  cpp: { language: 'cpp', version: '10.2.0' },
  c: { language: 'c', version: '10.2.0' },
  go: { language: 'go', version: '1.16.2' },
  rust: { language: 'rust', version: '1.68.2' },
  ruby: { language: 'ruby', version: '3.0.1' },
  php: { language: 'php', version: '8.2.3' },
};

/**
 * Execute code using Piston API
 * @param {string} code - The code to execute
 * @param {string} language - Monaco language identifier
 * @returns {Promise<Object>} Execution result
 */
async function executeCode(code, language) {
  const startTime = Date.now();

  // Check if language is supported
  const pistonConfig = LANGUAGE_MAP[language];
  if (!pistonConfig) {
    throw new Error(`Language '${language}' is not supported for execution`);
  }

  try {
    const response = await axios.post(
      `${PISTON_API_URL}/execute`,
      {
        language: pistonConfig.language,
        version: pistonConfig.version,
        files: [
          {
            content: code
          }
        ]
      },
      {
        timeout: 10000 // 10 second timeout
      }
    );

    const executionTime = Date.now() - startTime;
    const result = response.data.run;

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.code || 0,
      executionTime,
      language: pistonConfig.language,
      version: pistonConfig.version
    };
  } catch (error) {
    console.error('[ExecutionService] Error:', error.message);

    if (error.code === 'ECONNABORTED') {
      throw new Error('Execution timed out after 10 seconds');
    }

    if (error.response) {
      throw new Error(`Piston API error: ${error.response.status}`);
    }

    throw new Error('Code execution service unavailable');
  }
}

/**
 * Get list of supported languages
 * @returns {Array<string>} Array of supported Monaco language identifiers
 */
function getSupportedLanguages() {
  return Object.keys(LANGUAGE_MAP);
}

module.exports = {
  executeCode,
  getSupportedLanguages,
  LANGUAGE_MAP
};
