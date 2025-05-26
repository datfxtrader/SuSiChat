
interface LanguageSegment {
  language: 'vi' | 'en' | 'pl' | 'mixed';
  text: string;
  start: number;
}

interface LanguageAnalysis {
  primaryLanguage: string;
  segments: LanguageSegment[];
  hasCodeSwitching: boolean;
  slangTerms: string[];
}

export class VietnameseLanguageService {
  private slangDictionary: Map<string, string>;
  private vietnameseStopwords: Set<string>;
  private commonVietnameseWords: Set<string>;

  constructor() {
    this.loadSlangDictionary();
    this.loadStopwords();
    this.loadCommonVietnameseWords();
  }

  async detectCodeSwitching(text: string): Promise<LanguageAnalysis> {
    // Detect mixed Vietnamese-English
    const segments = this.segmentByLanguage(text);
    
    return {
      primaryLanguage: this.determinePrimaryLanguage(segments),
      segments,
      hasCodeSwitching: segments.length > 1,
      slangTerms: this.detectSlang(text)
    };
  }

  private segmentByLanguage(text: string): LanguageSegment[] {
    const words = text.split(/\s+/);
    const segments: LanguageSegment[] = [];
    let currentSegment: LanguageSegment | null = null;
    
    for (const word of words) {
      const lang = this.detectWordLanguage(word);
      
      if (!currentSegment || currentSegment.language !== lang) {
        if (currentSegment) segments.push(currentSegment);
        currentSegment = {
          language: lang,
          text: word,
          start: text.indexOf(word)
        };
      } else {
        currentSegment.text += ' ' + word;
      }
    }
    
    if (currentSegment) segments.push(currentSegment);
    return segments;
  }

  private detectWordLanguage(word: string): 'vi' | 'en' | 'pl' | 'mixed' {
    // Vietnamese detection - check for Vietnamese diacritics
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(word)) {
      return 'vi';
    }
    
    // Polish detection
    if (/[ąćęłńóśźż]/i.test(word)) {
      return 'pl';
    }
    
    // Check common Vietnamese words without diacritics
    if (this.isCommonVietnameseWord(word.toLowerCase())) {
      return 'vi';
    }
    
    return 'en';
  }

  detectSlang(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const slangTerms: string[] = [];
    
    for (const word of words) {
      if (this.slangDictionary.has(word)) {
        slangTerms.push(word);
      }
    }
    
    return slangTerms;
  }

  private determinePrimaryLanguage(segments: LanguageSegment[]): string {
    const languageCounts = segments.reduce((acc, segment) => {
      acc[segment.language] = (acc[segment.language] || 0) + segment.text.length;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.keys(languageCounts).reduce((a, b) => 
      languageCounts[a] > languageCounts[b] ? a : b
    );
  }

  private isCommonVietnameseWord(word: string): boolean {
    return this.commonVietnameseWords.has(word);
  }

  private loadSlangDictionary(): void {
    this.slangDictionary = new Map([
      // Vietnamese slang
      ['vcl', 'vãi cả lúa'],
      ['vl', 'vãi lúa'],
      ['dm', 'đi mẹ'],
      ['ckia', 'con kia'],
      ['bae', 'baby/em yêu'],
      ['crush', 'người thương thầm'],
      
      // Common abbreviations
      ['ko', 'không'],
      ['dc', 'được'],
      ['bit', 'biết'],
      ['hok', 'không'],
      ['ns', 'nói'],
      ['ik', 'đi'],
      ['ak', 'à'],
      ['uk', 'ừ'],
      ['tks', 'thanks'],
      ['bn', 'bạn'],
      ['mk', 'mình'],
      ['ny', 'người yêu'],
      ['đc', 'được'],
      ['cx', 'cũng'],
      ['vs', 'với'],
      ['tại', 'vì'],
      ['r', 'rồi'],
      ['lm', 'làm'],
      ['lun', 'luôn'],
      ['đi', 'đi'],
      ['hem', 'không'],
      ['wa', 'quá'],
      ['ntn', 'như thế nào'],
      ['sao', 'thế nào']
    ]);
  }

  private loadStopwords(): void {
    this.vietnameseStopwords = new Set([
      'và', 'của', 'có', 'là', 'được', 'một', 'trong', 'không', 'với', 'này',
      'đó', 'để', 'những', 'các', 'từ', 'cho', 'như', 'khi', 'về', 'sau',
      'trước', 'nên', 'cũng', 'đã', 'sẽ', 'bởi', 'vì', 'theo', 'hay', 'hoặc'
    ]);
  }

  private loadCommonVietnameseWords(): void {
    this.commonVietnameseWords = new Set([
      'ban', 'minh', 'toi', 'anh', 'chi', 'em', 'co', 'khong', 'duoc', 'lam',
      'nhu', 'voi', 'roi', 'nay', 'do', 'cho', 'den', 'khi', 'sau', 'truoc',
      'nha', 'di', 'an', 'uong', 'ngu', 'choi', 'hoc', 'lam', 'viec', 'gia',
      'nha', 'xe', 'may', 'ban', 'be', 'yeu', 'thuong', 'buon', 'vui', 'cuoi'
    ]);
  }
}
