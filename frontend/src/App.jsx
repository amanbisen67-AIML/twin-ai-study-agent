import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { WeeklyPlanView } from "./components/WeeklyPlanView";
import { QuestionDrawer } from "./components/QuestionDrawer";
import { AttemptModal } from "./components/AttemptModal";
import { RunwaySkeleton } from "./components/Skeletons";
import {
  fetchTopicAnalysis,
  fetchLatestWeeklyPlan,
  generateWeeklyPlan,
  recordQuizAttempt,
  syncLeetCodeScraper
} from "./api/client";
import "./styles/twin-instrument.css";

export function App() {
  const [activeView, setActiveView] = useState("dashboard"); // "dashboard" | "plan"
  const [analysis, setAnalysis] = useState(null);
  const [plan, setPlan] = useState(null);
  
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState("");

  const [isAttemptModalOpen, setIsAttemptModalOpen] = useState(false);
  const [isSyncingScraper, setIsSyncingScraper] = useState(false);
  
  // Drawer state
  const [drawerQuestion, setDrawerQuestion] = useState(null);
  const [drawerSession, setDrawerSession] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load baseline data on mount
  const loadInitialData = useCallback(async () => {
    setIsLoadingAnalysis(true);
    setIsLoadingPlan(true);
    try {
      const [analysisData, planData] = await Promise.all([
        fetchTopicAnalysis(),
        fetchLatestWeeklyPlan()
      ]);
      setAnalysis(analysisData);
      setPlan(planData);
    } catch (err) {
      console.error("Failed to load Twin study agent data:", err);
    } finally {
      setIsLoadingAnalysis(false);
      setIsLoadingPlan(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Log Attempt Handler
  const handleLogAttempt = async (attemptData) => {
    try {
      await recordQuizAttempt({
        student_id: "student_alex_chen",
        ...attemptData
      });
      // Refresh analysis immediately to re-compute recency decay and terrain
      const updatedAnalysis = await fetchTopicAnalysis();
      setAnalysis(updatedAnalysis);
    } catch (err) {
      console.error("Failed to record attempt:", err);
    }
  };

  // Generate New Plan Handler
  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    setGenerationProgress(0.05);
    setGenerationMessage("Initiating autonomous revision planning...");
    try {
      const newPlan = await generateWeeklyPlan(
        "student_alex_chen",
        7,
        (progress, message) => {
          setGenerationProgress(progress);
          setGenerationMessage(message);
        }
      );
      setPlan(newPlan);
      // Switch view to plan to see newly generated runway
      setActiveView("plan");
    } catch (err) {
      console.error("Plan generation failed:", err);
    } finally {
      setIsGeneratingPlan(false);
      setGenerationProgress(1.0);
    }
  };

  // Sync LeetCode Scraper
  const handleSyncLeetCode = async () => {
    setIsSyncingScraper(true);
    try {
      await syncLeetCodeScraper();
      // Reload initial data to incorporate any freshly synced question templates
      const [analysisData, planData] = await Promise.all([
        fetchTopicAnalysis(),
        fetchLatestWeeklyPlan()
      ]);
      setAnalysis(analysisData);
      setPlan(planData);
    } catch (err) {
      console.error("LeetCode sync failed:", err);
    } finally {
      setIsSyncingScraper(false);
    }
  };

  const handleOpenQuestionDrawer = (question, session) => {
    if (!question && session?.questions?.length > 0) {
      setDrawerQuestion(session.questions[0]);
    } else {
      setDrawerQuestion(question);
    }
    setDrawerSession(session);
    setIsDrawerOpen(true);
  };

  return (
    <div className="twin-app-container">
      {/* Instrument Header */}
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenAttemptModal={() => setIsAttemptModalOpen(true)}
        onSyncLeetCode={handleSyncLeetCode}
        isSyncingScraper={isSyncingScraper}
        studentName="Alex Chen"
        targetRole="Senior Java Backend Engineer"
      />

      {/* Main Screen Content */}
      {activeView === "dashboard" ? (
        <Dashboard
          analysis={analysis}
          isLoading={isLoadingAnalysis}
          onSelectTopic={(topic) => {
            // Could filter or highlight
          }}
        />
      ) : (
        isLoadingPlan ? (
          <RunwaySkeleton />
        ) : (
          <WeeklyPlanView
            plan={plan}
            onGenerateNewPlan={handleGeneratePlan}
            isGenerating={isGeneratingPlan}
            generationProgress={generationProgress}
            generationMessage={generationMessage}
            onOpenQuestionDrawer={handleOpenQuestionDrawer}
          />
        )
      )}

      {/* Interactive Practice Question Slide-Over Drawer */}
      <QuestionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        question={drawerQuestion}
        session={drawerSession}
      />

      {/* Real-Time Quiz Attempt Logger Modal */}
      <AttemptModal
        isOpen={isAttemptModalOpen}
        onClose={() => setIsAttemptModalOpen(false)}
        onLogAttempt={handleLogAttempt}
      />
    </div>
  );
}

export default App;
