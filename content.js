class ContentAnalyzer {
  constructor() {
    this.isAnalyzing = false;
    this.init();
  }

  init() {
    console.log('ContentAnalyzer initialized');
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Message received in content:', request);
      if (request.action === 'toggleAnalysis') {
        this.analyzeContent();
        sendResponse({ status: 'analyzing' });
        return true;
      }
    });
  }

  analyzeContent() {
    try {
      console.log('Starting content analysis...');
      const pageContent = document.body.innerText;
      
      // Enhanced content analysis
      const analysis = {
        ...this.analyzeText(pageContent),
        readingTime: this.calculateReadingTime(pageContent),
        topEmotions: this.detectEmotions(pageContent),
        contentSummary: this.summarizeContent(pageContent),
        healthImpact: this.assessHealthImpact(pageContent)
      };

      console.log('Analysis complete:', analysis);
      
      // Send the results back
      chrome.runtime.sendMessage({
        action: 'analysisComplete',
        data: analysis
      });
    } catch (error) {
      console.error('Error in content analysis:', error);
      chrome.runtime.sendMessage({
        action: 'analysisComplete',
        data: this.getErrorAnalysis(error)
      });
    }
  }

  analyzeText(text) {
    const words = text.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    const sentences = text.split(/[.!?]+/).length;

    // Enhanced emotion detection
    const emotions = {
      positive: ['happy', 'good', 'great', 'excellent', 'wonderful', 'positive', 'joy', 'love', 'peaceful'],
      negative: ['sad', 'bad', 'terrible', 'awful', 'negative', 'horrible', 'angry', 'fear', 'anxiety'],
      anxiety: ['worry', 'stress', 'anxious', 'nervous', 'panic', 'fear', 'dread'],
      calm: ['peaceful', 'calm', 'relax', 'tranquil', 'serene', 'gentle', 'quiet']
    };

    const emotionCounts = Object.entries(emotions).reduce((counts, [emotion, words]) => {
      counts[emotion] = words.reduce((count, word) => 
        count + text.toLowerCase().split(word).length - 1, 0);
      return counts;
    }, {});

    const dominantEmotion = Object.entries(emotionCounts)
      .reduce((max, [emotion, count]) => 
        count > max.count ? {emotion, count} : max, 
        {emotion: 'neutral', count: 0}
      ).emotion;

    return {
      emotionalTone: dominantEmotion.charAt(0).toUpperCase() + dominantEmotion.slice(1),
      stats: {
        wordCount,
        sentences,
        ...emotionCounts
      }
    };
  }

  calculateReadingTime(text) {
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return {
      minutes,
      words
    };
  }

  detectEmotions(text) {
    const emotionPatterns = {
      'Joy': /happy|joy|delight|pleased|wonderful/gi,
      'Sadness': /sad|unhappy|depressed|down|miserable/gi,
      'Anger': /angry|furious|mad|rage|outraged/gi,
      'Fear': /scared|afraid|terrified|fearful|anxious/gi,
      'Surprise': /surprised|amazed|astonished|shocked/gi,
      'Love': /love|adore|cherish|caring|affection/gi
    };

    return Object.entries(emotionPatterns)
      .map(([emotion, pattern]) => ({
        emotion,
        intensity: (text.match(pattern) || []).length
      }))
      .filter(e => e.intensity > 0)
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 3);
  }

  summarizeContent(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const summary = sentences.slice(0, 2).join('. ') + '.';
    return summary.length > 150 ? summary.slice(0, 147) + '...' : summary;
  }

  assessHealthImpact(text) {
    const healthPatterns = {
      'Stress': /stress|pressure|overwhelm|burnout/gi,
      'Sleep': /sleep|insomnia|tired|fatigue|rest/gi,
      'Exercise': /exercise|workout|fitness|active|movement/gi,
      'Diet': /food|eat|nutrition|diet|healthy/gi,
      'Mental': /mental|mind|psychology|therapy|counseling/gi
    };

    return Object.entries(healthPatterns)
      .reduce((impacts, [area, pattern]) => {
        const mentions = (text.match(pattern) || []).length;
        if (mentions > 0) {
          impacts.push({
            area,
            relevance: mentions,
            advice: this.getHealthAdvice(area)
          });
        }
        return impacts;
      }, []);
  }

  getHealthAdvice(area) {
    const advice = {
      'Stress': 'Consider practicing mindfulness or deep breathing exercises',
      'Sleep': 'Maintain a regular sleep schedule and avoid screens before bedtime',
      'Exercise': 'Try to incorporate regular physical activity into your routine',
      'Diet': 'Focus on balanced, nutritious meals and stay hydrated',
      'Mental': 'Don\'t hesitate to seek professional support when needed'
    };
    return advice[area] || 'Take care of your overall well-being';
  }

  generateWarnings(positiveCount, negativeCount) {
    if (negativeCount > positiveCount * 2) {
      return "This content contains a high amount of negative emotional content.";
    }
    return "No significant concerns detected in the content.";
  }

  generateSuggestions(tone) {
    const commonSuggestions = [
      "Take regular breaks while browsing",
      "Practice mindful reading",
      "Consider how this content affects your mood"
    ];

    const toneSuggestions = {
      Negative: [
        "Consider balancing this content with positive material",
        "Take a break if you feel overwhelmed",
        "Remember to practice self-care"
      ],
      Positive: [
        "Share positive insights with others",
        "Note what makes this content uplifting",
        "Use this positive energy in your daily activities"
      ],
      Neutral: [
        "Reflect on how this information relates to you",
        "Consider different perspectives",
        "Take notes on key points"
      ]
    };

    return [...commonSuggestions, ...(toneSuggestions[tone] || [])];
  }

  getResources(tone) {
    const commonResources = [{
      title: "General Mental Health Resources",
      url: "https://www.mentalhealth.gov",
      description: "Official mental health resources and information"
    }];

    const specificResources = {
      Negative: [{
        title: "Coping Strategies",
        url: "https://www.mindful.org/how-to-cope-with-anxiety",
        description: "Tools and techniques for managing difficult emotions"
      }],
      Positive: [{
        title: "Maintaining Wellbeing",
        url: "https://www.mindful.org/category/meditation",
        description: "Resources for maintaining positive mental health"
      }]
    };

    return [...commonResources, ...(specificResources[tone] || [])];
  }

  getErrorAnalysis(error) {
    return {
      emotionalTone: "Error",
      warnings: "Error analyzing content: " + error.message,
      suggestions: [],
      resources: this.getResources("error")
    };
  }
}

// Check if the analyzer is already initialized
if (!window.contentAnalyzer) {
  console.log('Creating new ContentAnalyzer instance');
  window.contentAnalyzer = new ContentAnalyzer();
} 