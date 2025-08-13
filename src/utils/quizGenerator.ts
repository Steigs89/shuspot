interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface PdfPage {
  pageNumber: number;
  text: string;
  words: string[];
}

export class QuizGenerator {
  private static extractKeyInformation(pages: PdfPage[]): {
    characters: string[];
    locations: string[];
    actions: string[];
    objects: string[];
    concepts: string[];
  } {
    const allText = pages.map(page => page.text).join(' ').toLowerCase();
    const words = pages.flatMap(page => page.words).map(word => word.toLowerCase());
    
    // Common patterns for different types of information
    const characterPatterns = [
      /\b([A-Z][a-z]+)\s+(said|asked|told|went|walked|ran|jumped|played|looked|saw|found|met)\b/g,
      /\b(mom|dad|mother|father|grandma|grandpa|sister|brother|friend|teacher|doctor|nurse|police|firefighter)\b/gi,
      /\b([A-Z][a-z]+)\s+(was|is|had|has)\b/g
    ];
    
    const locationPatterns = [
      /\b(at|in|to|from|near|by)\s+(the\s+)?([a-z]+(?:\s+[a-z]+)*?)\b/g,
      /\b(home|school|park|store|library|hospital|farm|forest|beach|mountain|city|town|village)\b/gi,
      /\b(kitchen|bedroom|bathroom|living room|classroom|playground|garden)\b/gi
    ];
    
    const actionPatterns = [
      /\b(went|walked|ran|jumped|played|ate|drank|read|wrote|drew|sang|danced|cooked|cleaned|helped)\b/gi,
      /\b(found|saw|met|visited|called|asked|told|said|laughed|cried|smiled)\b/gi
    ];
    
    const objectPatterns = [
      /\b(book|toy|ball|car|bike|phone|computer|food|water|milk|bread|apple|cake)\b/gi,
      /\b(table|chair|bed|door|window|tree|flower|animal|dog|cat|bird|fish)\b/gi
    ];
    
    // Extract information using patterns
    const characters = this.extractUniqueMatches(allText, characterPatterns).slice(0, 10);
    const locations = this.extractUniqueMatches(allText, locationPatterns).slice(0, 8);
    const actions = this.extractUniqueMatches(allText, actionPatterns).slice(0, 15);
    const objects = this.extractUniqueMatches(allText, objectPatterns).slice(0, 12);
    
    // Extract key concepts (important words that appear frequently)
    const concepts = this.extractKeyConcepts(words).slice(0, 10);
    
    return { characters, locations, actions, objects, concepts };
  }
  
  private static extractUniqueMatches(text: string, patterns: RegExp[]): string[] {
    const matches = new Set<string>();
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const captured = match[1] || match[3] || match[0];
        if (captured && captured.length > 2 && captured.length < 20) {
          matches.add(this.capitalizeFirst(captured.trim()));
        }
      }
    });
    
    return Array.from(matches);
  }
  
  private static extractKeyConcepts(words: string[]): string[] {
    // Count word frequency
    const wordCount = new Map<string, number>();
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
      if (cleanWord.length > 3 && !stopWords.has(cleanWord)) {
        wordCount.set(cleanWord, (wordCount.get(cleanWord) || 0) + 1);
      }
    });
    
    // Get most frequent words
    return Array.from(wordCount.entries())
      .filter(([word, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => this.capitalizeFirst(word));
  }
  
  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
  
  private static generateWhoQuestion(characters: string[], text: string): QuizQuestion | null {
    if (characters.length < 3) return null;
    
    const mainCharacter = characters[0];
    const options = [mainCharacter, ...characters.slice(1, 3)];
    
    // Add a random distractor if needed
    const distractors = ['Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Morgan'];
    while (options.length < 3) {
      const distractor = distractors[Math.floor(Math.random() * distractors.length)];
      if (!options.includes(distractor)) {
        options.push(distractor);
      }
    }
    
    return {
      id: 1,
      question: `Who is the main character in this story?`,
      options: this.shuffleArray(options),
      correctAnswer: options.indexOf(mainCharacter),
      explanation: `${mainCharacter} is mentioned most frequently in the story.`
    };
  }
  
  private static generateWhereQuestion(locations: string[], text: string): QuizQuestion | null {
    if (locations.length < 2) return null;
    
    const mainLocation = locations[0];
    const options = [mainLocation, ...locations.slice(1, 2)];
    
    // Add distractors
    const distractors = ['Park', 'School', 'Home', 'Store', 'Library', 'Beach'];
    while (options.length < 3) {
      const distractor = distractors[Math.floor(Math.random() * distractors.length)];
      if (!options.includes(distractor)) {
        options.push(distractor);
      }
    }
    
    return {
      id: 2,
      question: `Where does most of the story take place?`,
      options: this.shuffleArray(options),
      correctAnswer: options.indexOf(mainLocation),
      explanation: `The story mainly happens at ${mainLocation}.`
    };
  }
  
  private static generateWhatQuestion(objects: string[], actions: string[], text: string): QuizQuestion | null {
    if (actions.length < 2) return null;
    
    const mainAction = actions[0];
    const options = [mainAction, ...actions.slice(1, 2)];
    
    // Add distractors
    const distractors = ['Played', 'Walked', 'Ate', 'Read', 'Sang', 'Danced'];
    while (options.length < 3) {
      const distractor = distractors[Math.floor(Math.random() * distractors.length)];
      if (!options.includes(distractor)) {
        options.push(distractor);
      }
    }
    
    return {
      id: 3,
      question: `What did the main character do in the story?`,
      options: this.shuffleArray(options),
      correctAnswer: options.indexOf(mainAction),
      explanation: `The character ${mainAction.toLowerCase()} in the story.`
    };
  }
  
  private static generateSequenceQuestion(pages: PdfPage[]): QuizQuestion | null {
    if (pages.length < 2) return null;
    
    // Find events that happen in sequence
    const events = [];
    pages.forEach((page, index) => {
      const text = page.text.toLowerCase();
      if (text.includes('first') || text.includes('then') || text.includes('next') || text.includes('finally')) {
        events.push(`Page ${index + 1} events`);
      }
    });
    
    if (events.length < 2) {
      // Generate a simple sequence question
      return {
        id: 4,
        question: `What happened first in the story?`,
        options: ['The story began', 'The story ended', 'Nothing happened'],
        correctAnswer: 0,
        explanation: 'Stories always begin at the start.'
      };
    }
    
    return {
      id: 4,
      question: `What happened first in the story?`,
      options: [events[0], events[1], 'The story ended'],
      correctAnswer: 0,
      explanation: 'This event happened at the beginning of the story.'
    };
  }
  
  private static generateComprehensionQuestion(concepts: string[], text: string): QuizQuestion | null {
    if (concepts.length < 2) return null;
    
    const concept = concepts[0];
    const options = [concept, ...concepts.slice(1, 2)];
    
    // Add a distractor
    const distractors = ['Happiness', 'Adventure', 'Friendship', 'Learning', 'Fun', 'Magic'];
    while (options.length < 3) {
      const distractor = distractors[Math.floor(Math.random() * distractors.length)];
      if (!options.includes(distractor)) {
        options.push(distractor);
      }
    }
    
    return {
      id: 5,
      question: `What is this story mostly about?`,
      options: this.shuffleArray(options),
      correctAnswer: options.indexOf(concept),
      explanation: `The story focuses on ${concept.toLowerCase()}.`
    };
  }
  
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  public static generateQuiz(pages: PdfPage[], bookTitle: string): QuizQuestion[] {
    const keyInfo = this.extractKeyInformation(pages);
    const questions: QuizQuestion[] = [];
    
    // Generate different types of questions
    const whoQuestion = this.generateWhoQuestion(keyInfo.characters, pages.map(p => p.text).join(' '));
    if (whoQuestion) questions.push(whoQuestion);
    
    const whereQuestion = this.generateWhereQuestion(keyInfo.locations, pages.map(p => p.text).join(' '));
    if (whereQuestion) questions.push(whereQuestion);
    
    const whatQuestion = this.generateWhatQuestion(keyInfo.objects, keyInfo.actions, pages.map(p => p.text).join(' '));
    if (whatQuestion) questions.push(whatQuestion);
    
    const sequenceQuestion = this.generateSequenceQuestion(pages);
    if (sequenceQuestion) questions.push(sequenceQuestion);
    
    const comprehensionQuestion = this.generateComprehensionQuestion(keyInfo.concepts, pages.map(p => p.text).join(' '));
    if (comprehensionQuestion) questions.push(comprehensionQuestion);
    
    // If we don't have enough questions, add some generic ones
    while (questions.length < 5) {
      questions.push({
        id: questions.length + 1,
        question: `What did you learn from "${bookTitle}"?`,
        options: ['Something new', 'Nothing', 'Everything'],
        correctAnswer: 0,
        explanation: 'Reading always teaches us something new!'
      });
    }
    
    // Ensure we have exactly 5 questions
    return questions.slice(0, 5).map((q, index) => ({ ...q, id: index + 1 }));
  }
}