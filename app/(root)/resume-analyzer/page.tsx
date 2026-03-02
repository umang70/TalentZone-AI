import PageWrapper from "@/components/common/PageWrapper";
import Header from "@/components/layout/Header";
import ResumeAnalyzer from "@/components/layout/ResumeAnalyzer";
import React from "react";

export const metadata = {
  title: "Resume Analyzer – ResumeAI",
  description:
    "Upload your resume and a job description to get an instant ATS compatibility score, skill gap analysis, and improvement suggestions powered by Gemini AI.",
};

const ResumeAnalyzerPage = () => {
  return (
    <PageWrapper>
      <Header />
      <main className="relative z-10 min-h-screen">
        <ResumeAnalyzer />
      </main>
    </PageWrapper>
  );
};

export default ResumeAnalyzerPage;
