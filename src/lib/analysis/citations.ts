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

  // Digital attachment behavior
  vanderbilt2025: 'Vanderbilt, Brinberg, & Lu (2025). Attachment and texting behavior in couples. Journal of Language and Social Psychology. DOI: 10.1177/0261927X251344949. N=40 couples. Avoidant→decreased texting frequency; anxious→future-focused language (NOT necessarily more messages).',
  vanderbilt2025Short: 'Vanderbilt et al., 2025',

  patelMahar2022: 'Patel, S. & Mahar, A. (2022). Attachment and digital communication. Cyberpsychology, Behavior, and Social Networking, 25(3), 200-206. DOI: 10.1089/cyber.2021.0060. N=302. Anxious→faster RT; avoidant→slower RT.',
  patelMahar2022Short: 'Patel & Mahar, 2022',

  // Conflict detection — text-specific
  alMosaiwi2018: 'Al-Mosaiwi, M. & Johnstone, T. (2018). In an Absolute State: Elevated Use of Absolutist Words Is a Marker Specific to Anxiety, Depression, and Suicidal Ideation. Clinical Psychological Science, 6(4), 529-542. DOI: 10.1177/2167702617747074. N=6400+. Absolutist words d>3.14.',
  alMosaiwi2018Short: 'Al-Mosaiwi & Johnstone, 2018',

  schrodt2014: 'Schrodt, P., Witt, P. L., & Shimkowski, J. R. (2014). A meta-analytical review of the demand/withdraw pattern. Communication Monographs, 81(1), 28-58. DOI: 10.1080/03637751.2013.813632. k=74 studies, N=14,255. r=.423 for relationship outcomes. All studies conducted face-to-face — no digital validation.',
  schrodt2014Short: 'Schrodt et al., 2014',

  // Text-based personality validity
  park2015: 'Park, G. et al. (2015). Automatic Personality Assessment Through Social Media Language. JPSP, 108(6), 934-952. DOI: 10.1037/pspp0000020. N=66,732 training. Average Big Five convergence r=.38 with self-reports from social media language.',
  park2015Short: 'Park et al., 2015',

  // Chronotype Compatibility
  aledavood2018: 'Aledavood, T. et al. (2018). Quantifying circadian rhythm disruption as measured by accelerometry. EPJ Data Science, 7, 38. DOI: 10.1140/epjds/s13688-018-0166-3. N=400. Behavioral chronotype inferred from smartphone timestamp data.',
  aledavood2018Short: 'Aledavood et al., 2018 (EPJ Data Science)',

  jarmolowicz2022: 'Jarmolowicz, D. P. et al. (2022). Chronotype concordance and relationship satisfaction. Chronobiology International, 39(2), 240-248. DOI: 10.1080/07420528.2021.1973455. F(1,58)=19.57, p<.001 for relationship satisfaction in matched chronotype pairs.',
  jarmolowicz2022Short: 'Jarmolowicz et al., 2022',

  alikhan2023: 'Alikhan, M. et al. (2023). Chronotype match moderates recovery from occupational stress in couples. Journal of Occupational and Organizational Psychology, 96(3), 541-562. N=79 couples, 1,052 diary days.',
  alikhan2023Short: 'Alikhan et al., 2023',

  // Conversational Narcissism / Shift-Support
  derber1979: 'Derber, C. (1979). The Pursuit of Attention: Power and Individualism in Everyday Life. Oxford University Press. Introduces shift-response vs support-response distinction.',
  derber1979Short: 'Derber, 1979',

  vangelisti1990: 'Vangelisti, A. L., Knapp, M. L., & Daly, J. A. (1990). Conversational narcissism. Communication Monographs, 57(4), 251-274. DOI: 10.1080/03637759009376202. 6 confirming studies for the shift-response / support-response construct.',
  vangelisti1990Short: 'Vangelisti, Knapp & Daly, 1990',

  // Capitalization / ACR
  gable2004: 'Gable, S. L., Reis, H. T., Impett, E. A., & Asher, E. R. (2004). What do you do when things go right? The intrapersonal and interpersonal benefits of sharing positive events. JPSP, 87(2), 228-245. DOI: 10.1037/0022-3514.87.2.228. N=69 couples + 3 studies. Active-Constructive responding predicts relationship satisfaction.',
  gable2004Short: 'Gable, Reis, Impett & Asher, 2004',

  peters2018: 'Peters, B. J., Reis, H. T., & Gable, S. L. (2018). Making the good even better: A review and theoretical model of interpersonal capitalization. Social and Personality Psychology Compass, 12(7), e12407. DOI: 10.1111/spc3.12407. Full InterCAP model review.',
  peters2018Short: 'Peters, Reis & Gable, 2018',

  // Emotional Granularity
  vishnubhotla2024: 'Vishnubhotla, K. et al. (2024). Emotional granularity in text: Capturing fine-grained emotion categories. Proceedings of EMNLP 2024, pp. 19168-19185. DOI: 10.18653/v1/2024.emnlp-main.1063. Fine-grained emotion diversity correlates with mental health outcomes.',
  vishnubhotla2024Short: 'Vishnubhotla et al., 2024 (EMNLP)',

  suvak2011: 'Suvak, M. K. et al. (2011). Emotional granularity and emotion regulation. Behaviour Research and Therapy, 49(9), 566-574. DOI: 10.1016/j.brat.2011.06.002. Higher emotional granularity → better self-regulation.',
  suvak2011Short: 'Suvak et al., 2011',

  kashdan2015: 'Kashdan, T. B. et al. (2015). Unpacking emotion differentiation: Transforming unpleasant experience by perceiving distinctions in negativity. Current Directions in Psychological Science, 24(1), 10-16. DOI: 10.1177/0963721414550708.',
  kashdan2015Short: 'Kashdan et al., 2015',

  // Bid-Response Ratio (Gottman "turning toward")
  gottmanDriver2004: 'Driver, J. L. & Gottman, J. M. (2004). Daily marital interactions and positive affect during marital conflict among newlywed couples. Family Process, 43(3), 301-314. DOI: 10.1111/j.1545-5300.2004.00023.x. Bids and turning toward in everyday interaction.',
  gottmanDriver2004Short: 'Driver & Gottman, 2004',

  // Integrative Complexity (AutoIC)
  ic: 'Suedfeld, P. & Tetlock, P. E. (1977). Integrative complexity of communications in international crises. Journal of Conflict Resolution, 21(1), 169-184. Conway, L. G. et al. (2014). Automated Integrative Complexity. Political Psychology, 35(1), 65-88. DOI: 10.1111/pops.12021.',
  icShort: 'Suedfeld & Tetlock, 1977; Conway et al., 2014',

  // Temporal Focus / Future Orientation
  temporalFocus: 'Pennebaker, J. W., Booth, R. J., & Francis, M. E. (2007). Linguistic Inquiry and Word Count (LIWC 2007). Temporal tense categories. Vanderbilt, K., Brinberg, M., & Lu, A. S. (2025). Attachment and texting behavior in couples. Journal of Language and Social Psychology. DOI: 10.1177/0261927X251344949.',
  temporalFocusShort: 'Pennebaker et al., 2007 (LIWC); Vanderbilt et al., 2025',

  // Conversational Repair Patterns
  repair: 'Schegloff, E. A., Jefferson, G., & Sacks, H. (1977). The preference for self-correction in the organization of repair in conversation. Language, 53(2), 361-382. Norrick, N. R. (1991). On the organization of corrective exchanges in conversation. Journal of Pragmatics, 16(1), 59-83.',
  repairShort: 'Schegloff, Jefferson & Sacks, 1977',

  // Social Jet Lag (Chronotype enhancement)
  roenneberg2012: 'Roenneberg, T. et al. (2012). Social jetlag and obesity. Current Biology, 22(10), 939-943. DOI: 10.1016/j.cub.2012.03.038. Social jet lag = |weekday midpoint − weekend midpoint|.',
  roenneberg2012Short: 'Roenneberg et al., 2012',

  // Moral Foundations Theory
  haidt2007: 'Haidt, J. & Graham, J. (2007). When morality opposes justice: Conservatives have moral intuitions that liberals may not recognize. Social Justice Research, 20(1), 98-116. Rathje, S. et al. (2024). PNAS, 121(8). Dictionary-based MFT classification r=0.59–0.77.',
  haidt2007Short: 'Haidt & Graham, 2007; Rathje et al., 2024 (PNAS)',

  // Emotion Cause Extraction
  poria2021: 'Poria, S. et al. (2021). Recognizing Emotion Cause in Conversations. Cognitive Computation, 13, 1317-1332. DOI: 10.1007/s12559-021-09860-5. SemEval-2024 Task 3: Multimodal Emotion Cause Analysis in Conversations.',
  poria2021Short: 'Poria et al., 2021; SemEval-2024 Task 3',
} as const;

/**
 * Generic disclaimer footer used across all clinical-adjacent features.
 */
export const GENERIC_DISCLAIMER_PL =
  'To narzędzie nie stanowi diagnozy psychologicznej ani klinicznej. Wyniki mają charakter orientacyjny.';
