'use client';

import { useState, useCallback } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Shield,
  Activity,
  Brain,
  Lock,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Quote,
  FileWarning,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  type SCIDResult,
  type SCIDDisorderResult,
  type SCIDDisorder,
  SCID_DISORDERS,
  SCID_DISCLAIMER,
  SCID_SECONDARY_DISCLAIMER,
  getDisorderByKey,
  getQuestionById,
  isQuestionAssessable,
  getOverallRiskLevel,
} from '@/lib/analysis/scid-ii';

// ============================================================
// TYPES
// ============================================================

interface SCIDScreenerProps {
  scidResult?: SCIDResult;
  onRunSCID?: () => void;
  isLoading?: boolean;
  progress?: number;
  messageCount: number;
  timespanMs: number;
  completedPasses: number[];
  canRun: boolean;
  reasonsCannotRun?: string[];
}

// ============================================================
// HELPER COMPONENTS
// ============================================================

function RiskBadge({ level }: { level: 'low' | 'moderate' | 'high' | 'very_high' }) {
  const config = {
    low: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', text: 'Niskie ryzyko' },
    moderate: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', text: 'Umiarkowane ryzyko' },
    high: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', text: 'Podwyższone ryzyko' },
    very_high: { color: 'bg-red-500/10 text-red-400 border-red-500/20', text: 'Wysokie ryzyko' },
  };
  const { color, text } = config[level];
  return <Badge className={`${color} border`}>{text}</Badge>;
}

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  let color = 'text-red-400';
  if (confidence >= 70) color = 'text-emerald-400';
  else if (confidence >= 40) color = 'text-yellow-400';
  else if (confidence >= 20) color = 'text-orange-400';

  return (
    <div className="flex items-center gap-1.5">
      <Activity className={`h-3 w-3 ${color}`} />
      <span className={`text-xs ${color}`}>{confidence}% pewności</span>
    </div>
  );
}

function AnswerIcon({ answer }: { answer: boolean | null }) {
  if (answer === true) return <CheckCircle2 className="h-4 w-4 text-red-400" />;
  if (answer === false) return <XCircle className="h-4 w-4 text-emerald-400" />;
  return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
}

function DisorderCard({
  disorder,
  result,
  defaultOpen = false,
}: {
  disorder: SCIDDisorder;
  result: SCIDDisorderResult;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const assessableQuestions = disorder.questions.filter(id => {
    const q = getQuestionById(id);
    return q && isQuestionAssessable(q);
  });
  const unassessableCount = disorder.questions.length - assessableQuestions.length;

  return (
    <Card
      className={`border transition-all duration-200 ${
        result.meetsThreshold
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-border bg-card/50'
      }`}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: disorder.color }}
                  />
                  <CardTitle className="text-sm font-medium text-foreground">
                    {disorder.name}
                  </CardTitle>
                  {result.meetsThreshold && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                      Przekroczono próg
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  {disorder.nameEn}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">
                    {result.yesCount}/{result.threshold}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {result.percentage}% progu
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="mt-3">
              <Progress
                value={result.percentage}
                className="h-1.5 bg-muted"
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <ConfidenceIndicator confidence={result.confidence} />
              {unassessableCount > 0 && (
                <span className="text-xs text-muted-foreground/60">
                  {unassessableCount} pytań nieocenialnych
                </span>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="border-t border-border pt-4 mt-2 space-y-3">
              {disorder.questions.map(questionId => {
                const answer = result.answers[questionId];
                const question = getQuestionById(questionId);
                if (!question) return null;

                const assessable = isQuestionAssessable(question);

                return (
                  <div
                    key={questionId}
                    className={`p-3 rounded-lg ${
                      answer?.answer === true
                        ? 'bg-red-500/10 border border-red-500/20'
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {assessable ? (
                          <AnswerIcon answer={answer?.answer ?? null} />
                        ) : (
                          <HelpCircle className="h-4 w-4 text-muted-foreground/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          <span className="text-muted-foreground mr-2">Q{questionId}.</span>
                          {question.text}
                        </p>
                        {assessable && answer && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">
                                Pewność: {answer.confidence}%
                              </span>
                            </div>
                            {answer.evidence.length > 0 && (
                              <div className="space-y-1">
                                {answer.evidence.slice(0, 3).map((evidence, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-1.5 text-xs text-muted-foreground"
                                  >
                                    <Quote className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    <span className="line-clamp-2">{evidence}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {!assessable && (
                          <p className="text-xs text-muted-foreground/60 mt-1 italic">
                            Nie można ocenić na podstawie wiadomości
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function SCIDScreener({
  scidResult,
  onRunSCID,
  isLoading,
  progress = 0,
  messageCount,
  timespanMs,
  completedPasses,
  canRun,
  reasonsCannotRun = [],
}: SCIDScreenerProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleRunClick = useCallback(() => {
    if (!confirmed) {
      setShowConfirmation(true);
      return;
    }
    onRunSCID?.();
  }, [confirmed, onRunSCID]);

  const handleConfirm = useCallback(() => {
    setConfirmed(true);
    setShowConfirmation(false);
    onRunSCID?.();
  }, [onRunSCID]);

  // Render loading state
  if (isLoading) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Brain className="h-5 w-5 text-orange-400 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-base font-medium text-foreground">
                Analiza SCID-II w toku
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Analizuję wzorce osobowości...
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={progress} className="h-2 bg-muted" />
            <p className="text-sm text-muted-foreground text-center">
              Przetwarzanie {progress}% - analiza {Math.round((progress / 100) * 119)} z 119 pytań
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render results state
  if (scidResult) {
    const riskLevel = getOverallRiskLevel(scidResult.disorders);
    const disordersWithResults = SCID_DISORDERS.map(disorder => ({
      disorder,
      result: scidResult.disorders[disorder.key],
    })).filter(item => item.result);

    const thresholdMet = disordersWithResults.filter(({ result }) => result.meetsThreshold);
    const nearThreshold = disordersWithResults.filter(
      ({ result }) => !result.meetsThreshold && result.percentage >= 50
    );
    const belowThreshold = disordersWithResults.filter(
      ({ result }) => result.percentage < 50
    );

    return (
      <div className="space-y-4">
        {/* Main Warning Alert */}
        <Alert className="border-red-500/30 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-400">Oświadczenie medyczne</AlertTitle>
          <AlertDescription className="text-red-300/80 text-sm">
            {SCID_DISCLAIMER}
          </AlertDescription>
        </Alert>

        {/* Summary Card */}
        <Card className="border-border bg-card/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Brain className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium text-foreground">
                    Podsumowanie przesiewu SCID-II
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Wynik ogólny i zagrożenie
                  </CardDescription>
                </div>
              </div>
              <RiskBadge level={riskLevel.level} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall Confidence */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Ogólna pewność analizy</span>
              </div>
              <ConfidenceIndicator confidence={scidResult.overallConfidence} />
            </div>

            {/* Risk Description */}
            <p className="text-sm text-muted-foreground">{riskLevel.description}</p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-semibold text-red-400">{thresholdMet.length}</div>
                <div className="text-xs text-muted-foreground">Przekroczono próg</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-semibold text-yellow-400">{nearThreshold.length}</div>
                <div className="text-xs text-muted-foreground">Zbliża się do progu</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-semibold text-emerald-400">{belowThreshold.length}</div>
                <div className="text-xs text-muted-foreground">Poniżej progu</div>
              </div>
            </div>

            {/* Secondary Disclaimer */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground/60">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <p>{SCID_SECONDARY_DISCLAIMER}</p>
            </div>
          </CardContent>
        </Card>

        {/* Disorders Above Threshold */}
        {thresholdMet.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Zaburzenia powyżej progu przesiewowego
            </h4>
            {thresholdMet.map(({ disorder, result }) => (
              <DisorderCard
                key={disorder.key}
                disorder={disorder}
                result={result}
                defaultOpen={thresholdMet.length === 1}
              />
            ))}
          </div>
        )}

        {/* Disorders Near Threshold */}
        {nearThreshold.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-yellow-400 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Zaburzenia zbliżające się do progu
            </h4>
            {nearThreshold.map(({ disorder, result }) => (
              <DisorderCard key={disorder.key} disorder={disorder} result={result} />
            ))}
          </div>
        )}

        {/* Disorders Below Threshold */}
        {belowThreshold.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between text-muted-foreground hover:text-foreground/80"
              >
                <span>Pokaż pozostałe wyniki ({belowThreshold.length})</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              {belowThreshold.map(({ disorder, result }) => (
                <DisorderCard key={disorder.key} disorder={disorder} result={result} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  }

  // Render pre-analysis state (button to run)
  return (
    <Card className="border-border bg-card/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Brain className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <CardTitle className="text-base font-medium text-foreground">
              SCID-II Screening
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Przesiewowe badanie osobowości
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning Badge */}
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Wymaga wyraźnej zgody
          </Badge>
          <Badge className="bg-muted text-muted-foreground border-border">
            <Lock className="h-3 w-3 mr-1" />
            Wrażliwe dane
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          Przeprowadź przesiewowe badanie osobowości SCID-II na podstawie wzorców komunikacji.
          Analiza ocenia 119 wskaźników powiązanych z cechami osobowości. Wyniki wskazują
          jedynie na potrzebę konsultacji ze specjalistą — nie stanowią diagnozy.
        </p>

        {/* Requirements */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Wymagania
          </h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              {messageCount >= 2000 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <span className={messageCount >= 2000 ? 'text-foreground/80' : 'text-muted-foreground'}>
                Minimum 2000 wiadomości ({messageCount.toLocaleString()})
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {timespanMs >= 6 * 30 * 24 * 60 * 60 * 1000 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <span
                className={
                  timespanMs >= 6 * 30 * 24 * 60 * 60 * 1000
                    ? 'text-foreground/80'
                    : 'text-muted-foreground'
                }
              >
                Minimum 6 miesięcy historii
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {completedPasses.length >= 3 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <span className={completedPasses.length >= 3 ? 'text-foreground/80' : 'text-muted-foreground'}>
                Ukończone analizy AI (1-3)
              </span>
            </div>
          </div>
        </div>

        {/* Cannot Run Reasons */}
        {!canRun && reasonsCannotRun.length > 0 && (
          <Alert className="border-red-500/30 bg-red-500/5">
            <FileWarning className="h-4 w-4 text-red-400" />
            <AlertTitle className="text-red-400 text-sm">Nie można uruchomić analizy</AlertTitle>
            <AlertDescription className="text-red-300/80 text-sm">
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {reasonsCannotRun.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Confirmation Dialog */}
        {showConfirmation && (
          <Alert className="border-orange-500/30 bg-orange-500/10">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <AlertTitle className="text-orange-400 text-sm">Potwierdź analizę</AlertTitle>
            <AlertDescription className="text-orange-300/80 text-sm space-y-3">
              <p>
                Zamierzasz uruchomić analizę SCID-II. To narzędzie przesiewowe NIE
                zastępuje diagnozy specjalisty.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleConfirm}
                  className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30"
                >
                  Rozumiem, uruchom analizę
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowConfirmation(false)}
                  className="text-muted-foreground hover:text-foreground/80"
                >
                  Anuluj
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Run Button */}
        {canRun && !showConfirmation && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleRunClick}
                  disabled={isLoading}
                  className="w-full bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Uruchom analizę SCID-II
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">
                  Analiza wymaga przetworzenia 119 pytań. To może potrwać kilka minut.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground/60 text-center">
          {SCID_DISCLAIMER}
        </p>
      </CardContent>
    </Card>
  );
}

export default SCIDScreener;
