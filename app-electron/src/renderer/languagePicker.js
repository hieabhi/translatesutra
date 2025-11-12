// Language picker logic
let selectedLanguage = 'en';
let selectedText = '';
let detectedLanguage = 'auto';

// Popular languages with their codes and names
const POPULAR_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文 (简体)' },
  { code: 'zh-tw', name: 'Chinese (Traditional)', nativeName: '中文 (繁體)' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' }
];

const elements = {
  selectedText: document.getElementById('selectedText'),
  detectedLanguage: document.getElementById('detectedLanguage'),
  languageSearch: document.getElementById('languageSearch'),
  languageGrid: document.getElementById('languageGrid'),
  cancelBtn: document.getElementById('cancelBtn'),
  translateBtn: document.getElementById('translateBtn'),
  loadingState: document.getElementById('loadingState')
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  populateLanguages();
  requestInitialData();
});

function setupEventListeners() {
  elements.languageSearch.addEventListener('input', handleLanguageSearch);
  elements.cancelBtn.addEventListener('click', handleCancel);
  elements.translateBtn.addEventListener('click', handleTranslate);
  
  // Handle IPC events
  if (window.electronAPI) {
    window.electronAPI.onLanguagePickerData((data) => {
      console.log('Received language picker data:', data);
      selectedText = data.text || '';
      detectedLanguage = data.detectedLanguage || 'auto';
      updateUI();
    });

    // Handle language detection results
    window.electronAPI.onLanguageDetected((data) => {
      console.log('Language detected:', data);
      detectedLanguage = data.detectedLanguage || 'auto';
      updateUI();
    });
  }
}

function populateLanguages(filteredLanguages = POPULAR_LANGUAGES) {
  elements.languageGrid.innerHTML = '';
  
  filteredLanguages.forEach(lang => {
    const option = document.createElement('div');
    option.className = 'language-option';
    option.dataset.code = lang.code;
    option.innerHTML = `
      <div style="font-weight: 500;">${lang.name}</div>
      <div style="font-size: 10px; opacity: 0.8;">${lang.nativeName}</div>
    `;
    
    if (lang.code === selectedLanguage) {
      option.classList.add('selected');
    }
    
    option.addEventListener('click', () => selectLanguage(lang.code, option));
    elements.languageGrid.appendChild(option);
  });
}

function selectLanguage(code, element) {
  console.log('Language selected:', code);
  
  // Remove previous selection
  document.querySelectorAll('.language-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  
  // Add selection to clicked element
  element.classList.add('selected');
  selectedLanguage = code;
  
  // Get language name
  const langInfo = POPULAR_LANGUAGES.find(l => l.code === code);
  const langName = langInfo ? langInfo.name : code.toUpperCase();
  
  // Enable translate button and update text
  elements.translateBtn.disabled = false;
  elements.translateBtn.style.opacity = '1';
  elements.translateBtn.textContent = `Translate to ${langName}`;
  
  // Auto-translate after a short delay
  console.log('Starting auto-translate countdown...');
  setTimeout(() => {
    if (selectedLanguage === code) {  // Make sure selection hasn't changed
      console.log('Auto-translating to:', code);
      handleTranslate();
    }
  }, 1500);  // 1.5 second delay for auto-translate
}

function handleLanguageSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  
  const filteredLanguages = POPULAR_LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(searchTerm) ||
    lang.nativeName.toLowerCase().includes(searchTerm) ||
    lang.code.toLowerCase().includes(searchTerm)
  );
  
  populateLanguages(filteredLanguages);
}

function handleCancel() {
  console.log('Cancel clicked');
  if (window.electronAPI && window.electronAPI.closeLanguagePicker) {
    window.electronAPI.closeLanguagePicker();
  }
}

async function handleTranslate() {
  if (!selectedText.trim()) {
    alert('No text selected for translation');
    return;
  }
  
  if (!selectedLanguage) {
    alert('Please select a target language');
    return;
  }
  
  console.log('Starting translation:', {
    text: selectedText,
    from: detectedLanguage,
    to: selectedLanguage
  });
  
  // Show loading state
  elements.loadingState.style.display = 'block';
  document.querySelector('.dialog-container').style.pointerEvents = 'none';
  
  try {
    if (window.electronAPI && window.electronAPI.startTranslation) {
      await window.electronAPI.startTranslation({
        text: selectedText,
        from: detectedLanguage === 'auto' ? undefined : detectedLanguage,
        to: selectedLanguage
      });
    }
  } catch (error) {
    console.error('Translation error:', error);
    alert('Translation failed: ' + error.message);
    
    // Hide loading state
    elements.loadingState.style.display = 'none';
    document.querySelector('.dialog-container').style.pointerEvents = 'auto';
  }
}

function updateUI() {
  if (selectedText) {
    elements.selectedText.textContent = selectedText.length > 200 
      ? selectedText.substring(0, 200) + '...' 
      : selectedText;
  }
  
  if (detectedLanguage && detectedLanguage !== 'auto') {
    const langInfo = POPULAR_LANGUAGES.find(l => l.code === detectedLanguage);
    elements.detectedLanguage.textContent = langInfo 
      ? `${langInfo.name} (${langInfo.nativeName})` 
      : detectedLanguage.toUpperCase();
  } else {
    elements.detectedLanguage.textContent = 'Auto-detect';
  }
}

function requestInitialData() {
  if (window.electronAPI && window.electronAPI.requestLanguagePickerData) {
    window.electronAPI.requestLanguagePickerData();
  }
}

// Export functions for testing
window.languagePicker = {
  selectLanguage,
  handleTranslate,
  handleCancel,
  updateUI
};