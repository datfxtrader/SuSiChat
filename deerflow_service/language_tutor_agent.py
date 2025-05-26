
"""
Language Tutor Agent for DeerFlow Study System

This agent specializes in language learning, providing corrections,
cultural context, and personalized learning experiences.
"""

import asyncio
import json
import logging
import time
import re
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger("language_tutor_agent")

class LanguageLevel(Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

class LearningFocus(Enum):
    GRAMMAR = "grammar"
    VOCABULARY = "vocabulary"
    CONVERSATION = "conversation"
    CULTURE = "culture"
    PRONUNCIATION = "pronunciation"

@dataclass
class LanguageCorrection:
    original: str
    corrected: str
    explanation: str
    type: str
    severity: str
    learning_tip: str

@dataclass
class CulturalNote:
    content: str
    context: str
    language: str
    relevance_score: float

@dataclass
class LearningInsight:
    concept: str
    mastery_level: float
    practice_suggestion: str
    next_steps: List[str]

class LanguageTutorAgent:
    """Specialized agent for language teaching and cultural learning"""
    
    def __init__(self, agent_id: str = "language_tutor"):
        self.agent_id = agent_id
        self.supported_languages = {
            'vi': 'Vietnamese',
            'pl': 'Polish', 
            'en': 'English',
            'zh': 'Chinese',
            'es': 'Spanish',
            'fr': 'French'
        }
        
        # Language-specific patterns and rules
        self.language_patterns = {
            'vi': {
                'common_mistakes': [
                    {'pattern': r'\bI am\b', 'correction': 'Tôi là', 'type': 'translation'},
                    {'pattern': r'\bthank you\b', 'correction': 'cảm ơn', 'type': 'vocabulary'}
                ],
                'cultural_cues': ['respect for elders', 'family values', 'formal address'],
                'grammar_focuses': ['tone marks', 'classifiers', 'word order']
            },
            'pl': {
                'common_mistakes': [
                    {'pattern': r'\bI am\b', 'correction': 'Jestem', 'type': 'translation'},
                    {'pattern': r'\bhello\b', 'correction': 'cześć/dzień dobry', 'type': 'vocabulary'}
                ],
                'cultural_cues': ['politeness levels', 'historical context', 'regional variations'],
                'grammar_focuses': ['cases', 'gender', 'verb aspects']
            }
        }
        
        logger.info(f"Language Tutor Agent {self.agent_id} initialized")

    async def analyze_conversation(self, text: str, target_language: str, user_level: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze user input for language learning opportunities"""
        
        analysis = {
            'corrections': [],
            'vocabulary_opportunities': [],
            'grammar_points': [],
            'cultural_notes': [],
            'learning_insights': [],
            'fluency_score': 0.0,
            'encouragement': ''
        }
        
        # Detect language mixing and errors
        corrections = await self._detect_language_errors(text, target_language, user_level)
        analysis['corrections'] = corrections
        
        # Find vocabulary learning opportunities
        vocab_ops = await self._identify_vocabulary_opportunities(text, target_language, user_level)
        analysis['vocabulary_opportunities'] = vocab_ops
        
        # Extract grammar learning points
        grammar_points = await self._extract_grammar_points(text, target_language)
        analysis['grammar_points'] = grammar_points
        
        # Add cultural context
        cultural_notes = await self._generate_cultural_context(text, target_language, context)
        analysis['cultural_notes'] = cultural_notes
        
        # Calculate fluency score
        analysis['fluency_score'] = self._calculate_fluency_score(text, corrections, target_language)
        
        # Generate encouraging feedback
        analysis['encouragement'] = self._generate_encouragement(analysis, user_level)
        
        # Create learning insights
        analysis['learning_insights'] = self._create_learning_insights(analysis, target_language)
        
        return analysis

    async def _detect_language_errors(self, text: str, target_language: str, user_level: str) -> List[LanguageCorrection]:
        """Detect and correct language errors gently"""
        corrections = []
        
        if target_language not in self.language_patterns:
            return corrections
            
        patterns = self.language_patterns[target_language]['common_mistakes']
        
        for pattern_info in patterns:
            matches = re.finditer(pattern_info['pattern'], text, re.IGNORECASE)
            for match in matches:
                correction = LanguageCorrection(
                    original=match.group(),
                    corrected=pattern_info['correction'],
                    explanation=f"In {self.supported_languages[target_language]}, we say '{pattern_info['correction']}'",
                    type=pattern_info['type'],
                    severity='gentle',
                    learning_tip=f"Try practicing this phrase in different sentences"
                )
                corrections.append(correction)
        
        return corrections

    async def _identify_vocabulary_opportunities(self, text: str, target_language: str, user_level: str) -> List[Dict[str, Any]]:
        """Identify opportunities to learn new vocabulary"""
        opportunities = []
        
        # Simple word extraction and suggestion
        words = re.findall(r'\b\w+\b', text.lower())
        common_words = ['hello', 'thank', 'please', 'good', 'day', 'how', 'are', 'you']
        
        for word in words:
            if word in common_words and target_language in ['vi', 'pl']:
                translation = self._get_translation(word, target_language)
                if translation:
                    opportunities.append({
                        'english_word': word,
                        'target_translation': translation,
                        'usage_example': f"Try saying: {translation}",
                        'difficulty': 'beginner' if word in ['hello', 'thank'] else 'intermediate'
                    })
        
        return opportunities[:3]  # Limit to 3 suggestions

    def _get_translation(self, word: str, target_language: str) -> Optional[str]:
        """Get basic translations for common words"""
        translations = {
            'vi': {
                'hello': 'xin chào',
                'thank': 'cảm ơn',
                'please': 'xin',
                'good': 'tốt',
                'day': 'ngày',
                'how': 'thế nào',
                'are': 'là',
                'you': 'bạn'
            },
            'pl': {
                'hello': 'cześć',
                'thank': 'dziękuję',
                'please': 'proszę',
                'good': 'dobry',
                'day': 'dzień',
                'how': 'jak',
                'are': 'jesteś',
                'you': 'ty'
            }
        }
        
        return translations.get(target_language, {}).get(word.lower())

    async def _extract_grammar_points(self, text: str, target_language: str) -> List[str]:
        """Extract grammar learning opportunities"""
        grammar_points = []
        
        if target_language not in self.language_patterns:
            return grammar_points
            
        focuses = self.language_patterns[target_language]['grammar_focuses']
        
        # Simple grammar pattern detection
        if 'word order' in focuses and len(text.split()) > 3:
            grammar_points.append(f"Notice the word order in {self.supported_languages[target_language]}")
            
        if 'tone marks' in focuses and target_language == 'vi':
            grammar_points.append("Vietnamese uses tone marks to change word meanings")
            
        if 'cases' in focuses and target_language == 'pl':
            grammar_points.append("Polish uses grammatical cases that change word endings")
        
        return grammar_points

    async def _generate_cultural_context(self, text: str, target_language: str, context: Dict[str, Any]) -> List[CulturalNote]:
        """Generate relevant cultural context"""
        cultural_notes = []
        
        if target_language not in self.language_patterns:
            return cultural_notes
            
        cues = self.language_patterns[target_language]['cultural_cues']
        
        # Check for cultural learning moments
        if 'family' in text.lower() and 'family values' in cues:
            cultural_notes.append(CulturalNote(
                content="Vietnamese culture places great emphasis on family hierarchy and respect",
                context="family_discussion",
                language=target_language,
                relevance_score=0.9
            ))
            
        if any(greeting in text.lower() for greeting in ['hello', 'hi', 'good morning']) and 'politeness levels' in cues:
            cultural_notes.append(CulturalNote(
                content="Polish has different levels of formality for greetings depending on the relationship",
                context="greetings",
                language=target_language,
                relevance_score=0.8
            ))
        
        return cultural_notes

    def _calculate_fluency_score(self, text: str, corrections: List[LanguageCorrection], target_language: str) -> float:
        """Calculate a simple fluency score"""
        base_score = 3.0  # Start with middle score
        
        # Adjust based on text length
        word_count = len(text.split())
        if word_count > 10:
            base_score += 0.5
        elif word_count < 3:
            base_score -= 0.5
            
        # Adjust based on corrections needed
        if len(corrections) == 0:
            base_score += 1.0
        elif len(corrections) <= 2:
            base_score += 0.5
        else:
            base_score -= 0.5
            
        # Keep score in 1-5 range
        return max(1.0, min(5.0, base_score))

    def _generate_encouragement(self, analysis: Dict[str, Any], user_level: str) -> str:
        """Generate encouraging feedback"""
        corrections_count = len(analysis['corrections'])
        fluency_score = analysis['fluency_score']
        
        if corrections_count == 0:
            return "Excellent! Your language use is very natural."
        elif corrections_count <= 2:
            return "Great progress! Just a few small adjustments and you're doing wonderfully."
        else:
            return "Good effort! Every mistake is a learning opportunity. Keep practicing!"

    def _create_learning_insights(self, analysis: Dict[str, Any], target_language: str) -> List[LearningInsight]:
        """Create actionable learning insights"""
        insights = []
        
        # Vocabulary insight
        if analysis['vocabulary_opportunities']:
            insights.append(LearningInsight(
                concept="vocabulary_expansion",
                mastery_level=0.6,
                practice_suggestion="Try using new vocabulary in different contexts",
                next_steps=["Practice with flashcards", "Use words in sentences", "Listen to native speakers"]
            ))
        
        # Grammar insight
        if analysis['grammar_points']:
            insights.append(LearningInsight(
                concept="grammar_application",
                mastery_level=0.7,
                practice_suggestion="Focus on the grammar patterns you're using",
                next_steps=["Review grammar rules", "Practice with exercises", "Get feedback on usage"]
            ))
        
        # Cultural insight
        if analysis['cultural_notes']:
            insights.append(LearningInsight(
                concept="cultural_awareness",
                mastery_level=0.8,
                practice_suggestion="Keep exploring cultural context in conversations",
                next_steps=["Read about culture", "Watch cultural content", "Practice culturally appropriate responses"]
            ))
        
        return insights

    async def generate_personalized_lesson(self, user_profile: Dict[str, Any], recent_mistakes: List[Dict], interests: List[str]) -> Dict[str, Any]:
        """Generate a personalized lesson based on user needs"""
        
        target_language = user_profile.get('target_language', 'vi')
        user_level = user_profile.get('level', 'beginner')
        
        lesson = {
            'title': f"Personalized {self.supported_languages.get(target_language, target_language)} Lesson",
            'estimated_time': 15,
            'difficulty': user_level,
            'objectives': [],
            'vocabulary': [],
            'grammar_focus': [],
            'cultural_notes': [],
            'exercises': [],
            'conversation_practice': []
        }
        
        # Create objectives based on recent mistakes
        if recent_mistakes:
            lesson['objectives'].append("Address common mistakes from recent conversations")
            lesson['objectives'].append("Practice correct usage patterns")
        
        # Add vocabulary from interests
        if interests:
            lesson['objectives'].append(f"Learn vocabulary related to {interests[0]}")
            lesson['vocabulary'] = self._generate_vocabulary_for_interest(interests[0], target_language)
        
        # Add grammar focus
        if target_language in self.language_patterns:
            grammar_focuses = self.language_patterns[target_language]['grammar_focuses']
            lesson['grammar_focus'] = [f"Practice with {focus}" for focus in grammar_focuses[:2]]
        
        # Add cultural notes
        if target_language in self.language_patterns:
            cultural_cues = self.language_patterns[target_language]['cultural_cues']
            lesson['cultural_notes'] = [f"Understanding {cue}" for cue in cultural_cues[:2]]
        
        # Create simple exercises
        lesson['exercises'] = [
            {
                'type': 'translation',
                'instruction': 'Translate these common phrases',
                'items': self._generate_translation_exercises(target_language)
            },
            {
                'type': 'conversation',
                'instruction': 'Practice this conversation starter',
                'items': self._generate_conversation_starters(target_language, interests)
            }
        ]
        
        return lesson

    def _generate_vocabulary_for_interest(self, interest: str, target_language: str) -> List[Dict[str, str]]:
        """Generate vocabulary related to user interests"""
        vocabulary_sets = {
            'technology': {
                'vi': [
                    {'word': 'máy tính', 'translation': 'computer', 'usage': 'Tôi dùng máy tính mỗi ngày'},
                    {'word': 'điện thoại', 'translation': 'phone', 'usage': 'Điện thoại của tôi mới'}
                ],
                'pl': [
                    {'word': 'komputer', 'translation': 'computer', 'usage': 'Używam komputera codziennie'},
                    {'word': 'telefon', 'translation': 'phone', 'usage': 'Mój telefon jest nowy'}
                ]
            },
            'culture': {
                'vi': [
                    {'word': 'văn hóa', 'translation': 'culture', 'usage': 'Văn hóa Việt Nam rất phong phú'},
                    {'word': 'truyền thống', 'translation': 'tradition', 'usage': 'Đây là truyền thống của gia đình'}
                ],
                'pl': [
                    {'word': 'kultura', 'translation': 'culture', 'usage': 'Kultura polska jest bogata'},
                    {'word': 'tradycja', 'translation': 'tradition', 'usage': 'To jest tradycja rodzinna'}
                ]
            }
        }
        
        return vocabulary_sets.get(interest, {}).get(target_language, [])

    def _generate_translation_exercises(self, target_language: str) -> List[Dict[str, str]]:
        """Generate translation exercises"""
        exercises = {
            'vi': [
                {'english': 'How are you?', 'target': 'Bạn có khỏe không?'},
                {'english': 'Thank you very much', 'target': 'Cảm ơn bạn rất nhiều'}
            ],
            'pl': [
                {'english': 'How are you?', 'target': 'Jak się masz?'},
                {'english': 'Thank you very much', 'target': 'Dziękuję bardzo'}
            ]
        }
        
        return exercises.get(target_language, [])

    def _generate_conversation_starters(self, target_language: str, interests: List[str]) -> List[str]:
        """Generate conversation starters"""
        starters = {
            'vi': [
                'Hôm nay bạn thế nào?',
                'Bạn thích làm gì vào cuối tuần?',
                'Bạn có sở thích gì không?'
            ],
            'pl': [
                'Jak się dzisiaj czujesz?',
                'Co lubisz robić w weekendy?',
                'Jakie masz hobby?'
            ]
        }
        
        return starters.get(target_language, ['How are you today?'])

    async def provide_gentle_corrections(self, text: str, target_language: str) -> Dict[str, Any]:
        """Provide gentle, encouraging language corrections"""
        
        corrections = await self._detect_language_errors(text, target_language, 'beginner')
        
        # Make corrections more encouraging
        formatted_corrections = []
        for correction in corrections:
            formatted_corrections.append({
                'original': correction.original,
                'corrected': correction.corrected,
                'explanation': f"💡 {correction.explanation}",
                'type': correction.type,
                'severity': 'gentle',
                'learning_tip': f"🌟 {correction.learning_tip}",
                'encouragement': "Great attempt! Small adjustments like this will help you sound more natural."
            })
        
        return {
            'corrections': formatted_corrections,
            'overall_feedback': self._generate_overall_feedback(len(corrections)),
            'practice_suggestions': self._suggest_practice_activities(corrections, target_language)
        }

    def _generate_overall_feedback(self, correction_count: int) -> str:
        """Generate encouraging overall feedback"""
        if correction_count == 0:
            return "🎉 Perfect! Your language use is spot-on!"
        elif correction_count <= 2:
            return "👍 Excellent work! Just a couple of small tweaks and you're golden!"
        else:
            return "💪 Good effort! Remember, every correction is a step forward in your learning journey!"

    def _suggest_practice_activities(self, corrections: List[LanguageCorrection], target_language: str) -> List[str]:
        """Suggest specific practice activities"""
        suggestions = []
        
        if any(c.type == 'vocabulary' for c in corrections):
            suggestions.append(f"Practice new {self.supported_languages[target_language]} vocabulary with flashcards")
        
        if any(c.type == 'grammar' for c in corrections):
            suggestions.append(f"Review {self.supported_languages[target_language]} grammar patterns")
        
        if any(c.type == 'pronunciation' for c in corrections):
            suggestions.append(f"Listen to native {self.supported_languages[target_language]} speakers")
        
        # Always add a general suggestion
        suggestions.append(f"Have more conversations in {self.supported_languages[target_language]}")
        
        return suggestions

# Global instance
language_tutor_agent = LanguageTutorAgent()
