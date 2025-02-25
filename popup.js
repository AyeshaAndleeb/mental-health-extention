class PopupManager {
  constructor() {
    this.init();
  }

  init() {
    console.log('PopupManager initialized');
    this.bindElements();
    this.attachListeners();
    this.loadCurrentAnalysis();
    this.showLoadingState(false);
  }

  bindElements() {
    this.toggleButton = document.getElementById('toggleAnalysis');
    this.emotionScore = document.getElementById('emotion-score');
    this.contentWarning = document.getElementById('content-warning');
    this.suggestionList = document.getElementById('suggestion-list');
    this.resourceList = document.getElementById('resource-list');
  }

  showLoadingState(isLoading) {
    this.toggleButton.disabled = isLoading;
    this.toggleButton.textContent = isLoading ? 'Analyzing...' : 'Analyze Page';
    if (isLoading) {
      this.emotionScore.textContent = 'Analyzing content...';
    }
  }

  attachListeners() {
    this.toggleButton.addEventListener('click', async () => {
      console.log('Toggle button clicked');
      this.showLoadingState(true);
      
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
          throw new Error('No active tab found');
        }

        // Inject content script if not already injected
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
        } catch (e) {
          console.log('Content script already injected or injection failed:', e);
        }

        // Send message to content script
        await chrome.tabs.sendMessage(tab.id, { action: 'toggleAnalysis' });
      } catch (error) {
        console.error('Error:', error);
        this.showError(error.message || 'Could not connect to page. Please refresh and try again.');
        this.showLoadingState(false);
      }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Message received in popup:', message);
      if (message.action === 'analysisComplete') {
        this.showLoadingState(false);
        this.updateUI(message.data);
      }
    });
  }

  showError(message) {
    this.emotionScore.textContent = 'Error';
    this.contentWarning.textContent = message;
    this.suggestionList.innerHTML = '';
    this.resourceList.innerHTML = '';
  }

  loadCurrentAnalysis() {
    chrome.storage.local.get(['lastAnalysis'], (result) => {
      if (result.lastAnalysis) {
        this.updateUI(result.lastAnalysis);
      }
    });
  }

  updateUI(analysis) {
    console.log('Updating UI with analysis:', analysis);
    
    // Update emotional tone with any stats if available
    let toneText = `Emotional tone: ${analysis.emotionalTone}`;
    if (analysis.stats) {
      toneText += `\nWords analyzed: ${analysis.stats.wordCount}`;
      toneText += `\nPositive words: ${analysis.stats.positiveWords}`;
      toneText += `\nNegative words: ${analysis.stats.negativeWords}`;
    }
    this.emotionScore.textContent = toneText;
    
    // Update warnings
    if (analysis.warnings) {
      this.contentWarning.textContent = analysis.warnings;
    }

    this.updateSuggestions(analysis.suggestions);
    this.updateResources(analysis.resources);
  }

  updateSuggestions(suggestions) {
    if (!suggestions || !suggestions.length) {
      this.suggestionList.innerHTML = '<li>No suggestions available</li>';
      return;
    }
    this.suggestionList.innerHTML = suggestions
      .map(suggestion => `<li>${suggestion}</li>`)
      .join('');
  }

  updateResources(resources) {
    if (!resources || !resources.length) {
      this.resourceList.innerHTML = '<div>No resources available</div>';
      return;
    }
    this.resourceList.innerHTML = resources
      .map(resource => `
        <div class="resource-item">
          <a href="${resource.url}" target="_blank">${resource.title}</a>
          <p>${resource.description}</p>
        </div>
      `)
      .join('');
  }
}

// Initialize the popup manager
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup loaded');
  new PopupManager();
}); 