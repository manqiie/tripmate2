// src/services/wikipediaService.js
class WikipediaService {
  constructor() {
    this.baseUrl = 'https://en.wikipedia.org/api/rest_v1';
    this.searchUrl = 'https://en.wikipedia.org/w/api.php';
  }

  // Search for Wikipedia articles
  async searchArticles(query, limit = 5) {
    try {
      console.log('🔍 Searching Wikipedia for:', query);
      
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        list: 'search',
        srsearch: query,
        srlimit: limit,
        origin: '*'
      });

      const response = await fetch(`${this.searchUrl}?${params}`);
      const data = await response.json();
      
      if (data.query && data.query.search) {
        console.log('✅ Wikipedia search results:', data.query.search.length);
        return data.query.search.map(item => ({
          title: item.title,
          snippet: item.snippet,
          pageid: item.pageid
        }));
      }
      
      return [];
    } catch (error) {
      console.error('❌ Wikipedia search error:', error);
      return [];
    }
  }

  // Get page summary from REST API
  async getPageSummary(title) {
    try {
      console.log('📄 Getting Wikipedia summary for:', title);
      
      const encodedTitle = encodeURIComponent(title);
      const response = await fetch(`${this.baseUrl}/page/summary/${encodedTitle}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Wikipedia summary retrieved');
      
      return {
        title: data.title,
        extract: data.extract,
        thumbnail: data.thumbnail?.source || null,
        url: data.content_urls?.desktop?.page || null,
        coordinates: data.coordinates || null
      };
    } catch (error) {
      console.error('❌ Wikipedia summary error:', error);
      return null;
    }
  }

  // Get page content sections
  async getPageContent(title, sections = [0, 1]) {
    try {
      console.log('📖 Getting Wikipedia content for:', title);
      
      const encodedTitle = encodeURIComponent(title);
      const response = await fetch(`${this.baseUrl}/page/mobile-sections/${encodedTitle}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.sections) {
        // Get specified sections or first few by default
        const relevantSections = data.sections
          .filter(section => sections.includes(section.id))
          .map(section => ({
            title: section.line,
            content: this.cleanWikiText(section.text || ''),
            id: section.id
          }));
        
        console.log('✅ Wikipedia content retrieved, sections:', relevantSections.length);
        return relevantSections;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Wikipedia content error:', error);
      return [];
    }
  }

  // Clean Wikipedia text from HTML and references
  cleanWikiText(text) {
    if (!text) return '';
    
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\[\d+\]/g, '') // Remove reference numbers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Enhanced question answering
  async answerQuestion(place, question) {
    try {
      console.log('🤖 Answering question about:', place, '- Question:', question);
      
      // Strategy 1: Search for place + question context
      let searchQuery = `${place} ${this.getQuestionContext(question)}`;
      let searchResults = await this.searchArticles(searchQuery, 3);
      
      // Strategy 2: If no specific results, search for just the place
      if (searchResults.length === 0) {
        console.log('🔄 Fallback to general place search');
        searchResults = await this.searchArticles(place, 2);
      }
      
      if (searchResults.length === 0) {
        return {
          answer: "I couldn't find information about this place. Please try a different search term.",
          source: null,
          title: null,
          type: 'not_found'
        };
      }

      // Get the most relevant result
      const bestMatch = searchResults[0];
      const summary = await this.getPageSummary(bestMatch.title);
      
      if (!summary) {
        return {
          answer: "I found the place but couldn't retrieve detailed information. Please try again.",
          source: null,
          title: bestMatch.title,
          type: 'error'
        };
      }

      // Get additional content if needed for specific questions
      let detailedAnswer = summary.extract;
      
      if (this.needsDetailedContent(question)) {
        const content = await this.getPageContent(bestMatch.title, [0, 1, 2]);
        if (content.length > 0) {
          const relevantContent = this.extractRelevantContent(content, question);
          if (relevantContent) {
            detailedAnswer = relevantContent;
          }
        }
      }

      // Format the answer based on question type
      const formattedAnswer = this.formatAnswerForQuestion(detailedAnswer, question, place);
      
      return {
        answer: formattedAnswer,
        source: summary.url,
        title: summary.title,
        thumbnail: summary.thumbnail,
        type: 'success'
      };
      
    } catch (error) {
      console.error('❌ Error answering question:', error);
      return {
        answer: "Sorry, I encountered an error while searching for information. Please try again.",
        source: null,
        title: null,
        type: 'error'
      };
    }
  }

  // Get search context keywords based on question type
  getQuestionContext(question) {
    const lowerQuestion = question.toLowerCase();
    
    const contextMap = {
      'attraction': ['attractions', 'tourist', 'sightseeing', 'landmarks'],
      'food': ['cuisine', 'food', 'restaurant', 'dining', 'local dishes'],
      'weather': ['climate', 'weather', 'temperature', 'season'],
      'history': ['history', 'historical', 'founded', 'past'],
      'transport': ['transport', 'airport', 'travel', 'getting there'],
      'culture': ['culture', 'tradition', 'people', 'customs'],
      'language': ['language', 'spoken', 'official language'],
      'currency': ['currency', 'money', 'exchange rate'],
      'time': ['time zone', 'best time', 'visit', 'season']
    };
    
    for (const [key, keywords] of Object.entries(contextMap)) {
      if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
        return keywords[0]; // Return primary keyword
      }
    }
    
    return ''; // No specific context
  }

  // Check if question needs detailed content beyond summary
  needsDetailedContent(question) {
    const detailedQuestions = [
      'history', 'culture', 'tradition', 'architecture', 
      'economy', 'politics', 'education', 'transportation'
    ];
    
    return detailedQuestions.some(topic => 
      question.toLowerCase().includes(topic)
    );
  }

  // Extract relevant content based on question
  extractRelevantContent(contentSections, question) {
    const lowerQuestion = question.toLowerCase();
    
    // Find most relevant section
    const relevantSection = contentSections.find(section => {
      const sectionTitle = section.title?.toLowerCase() || '';
      const sectionContent = section.content?.toLowerCase() || '';
      
      return sectionTitle.includes(lowerQuestion.split(' ')[0]) ||
             sectionContent.includes(lowerQuestion.split(' ')[0]);
    });
    
    if (relevantSection && relevantSection.content) {
      // Return first 2 sentences of relevant content
      const sentences = relevantSection.content.split('. ');
      return sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '.' : '');
    }
    
    return null;
  }

  // Format answer based on question type
  formatAnswerForQuestion(content, question, place) {
    if (!content) return "No information available.";
    
    const lowerQuestion = question.toLowerCase();
    
    // For weather/climate questions
    if (lowerQuestion.includes('weather') || lowerQuestion.includes('climate')) {
      return `The climate in ${place}: ${content}`;
    }
    
    // For food questions
    if (lowerQuestion.includes('food') || lowerQuestion.includes('cuisine')) {
      return `About the cuisine of ${place}: ${content}`;
    }
    
    // For attraction questions
    if (lowerQuestion.includes('attraction') || lowerQuestion.includes('tourist')) {
      return `Tourist attractions in ${place}: ${content}`;
    }
    
    // For history questions
    if (lowerQuestion.includes('history') || lowerQuestion.includes('historical')) {
      return `History of ${place}: ${content}`;
    }
    
    // Default formatting
    return content;
  }

  // Test API availability
  async testApi() {
    try {
      const testResult = await this.searchArticles('Paris', 1);
      return {
        available: testResult.length > 0,
        message: testResult.length > 0 ? 'Wikipedia API is working' : 'No results returned'
      };
    } catch (error) {
      return {
        available: false,
        message: `Wikipedia API error: ${error.message}`
      };
    }
  }
}

export default new WikipediaService();