/**
 * Academic citations for psychological frameworks used in PodTeksT.
 * Referenced by PsychDisclaimer components throughout the UI.
 */

export const PSYCH_CITATIONS = {
  gottman: 'Gottman, J. M. & Silver, N. (1999). The Seven Principles for Making Marriage Work.',
  gottmanShort: 'Gottman & Silver, 1999',

  bowlby: 'Bowlby, J. (1969). Attachment and Loss, Vol. 1: Attachment.',
  ainsworth: 'Ainsworth, M. D. S. et al. (1978). Patterns of Attachment.',
  attachmentShort: 'Bowlby, 1969; Ainsworth, 1978',

  bigFive: 'Costa, P. T. & McCrae, R. R. (1992). NEO-PI-R Professional Manual.',
  bigFiveShort: 'Costa & McCrae, 1992',

  pursuitWithdrawal: 'Christensen, A. & Heavey, C. L. (1990). Gender and Social Structure in the Demand/Withdraw Pattern. JPSP, 59(1), 73-81.',
  pursuitWithdrawalShort: 'Christensen & Heavey, 1990',

  mbti: 'Jung, C. G. (1921). Psychologische Typen; Myers, I. B. & Briggs, K. C. (1962). The Myers-Briggs Type Indicator.',
  mbtiShort: 'Jung, 1921; Myers & Briggs, 1962',

  sentiment: 'Dictionary-based approach inspired by AFINN (Nielsen, 2011) adapted for Polish.',
  sentimentShort: 'cf. Nielsen, 2011 (AFINN)',

  lsm: 'Ireland, M. E. & Pennebaker, J. W. (2010). Language Style Matching Predicts Relationship Initiation and Stability. Psychological Science, 21(10), 1547-1553.',
  lsmShort: 'Ireland & Pennebaker, 2010',

  pronoun: 'Pennebaker, J. W. (2011). The Secret Life of Pronouns: What Our Words Say About Us.',
  pronounShort: 'Pennebaker, 2011',

  conflictEscalation: 'Gottman, J. M. & Levenson, R. W. (2000). The Timing of Divorce. JPSP, 78(2), 260-278.',
  conflictEscalationShort: 'Gottman & Levenson, 2000',
} as const;

/**
 * Generic disclaimer footer used across all clinical-adjacent features.
 */
export const GENERIC_DISCLAIMER_PL =
  'To narzędzie nie stanowi diagnozy psychologicznej ani klinicznej. Wyniki mają charakter orientacyjny.';
