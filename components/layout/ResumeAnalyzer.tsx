"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  FileText,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Zap,
  Target,
  Lightbulb,
} from "lucide-react";

interface AnalysisResult {
  atsScore: number;
  skillMatch: number;
  formattingScore: number;
  missingSkills: string[];
  improvements: string[];
}

function ScoreRing({
  score,
  label,
  color,
  icon: Icon,
}: {
  score: number;
  label: string;
  color: string;
  icon: React.ElementType;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const colorMap: Record<string, { stroke: string; bg: string; text: string }> = {
    blue: {
      stroke: "#435ADA",
      bg: "bg-blue-50",
      text: "text-blue-600",
    },
    emerald: {
      stroke: "#10B981",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
    },
    violet: {
      stroke: "#8B5CF6",
      bg: "bg-violet-50",
      text: "text-violet-600",
    },
  };

  const c = colorMap[color] ?? colorMap.blue;

  const scoreLabel =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor";

  return (
    <div className={`flex flex-col items-center p-5 rounded-2xl ${c.bg} border border-white shadow-sm`}>
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="10"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={c.stroke}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold ${c.text}`}>{score}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <Icon className={`w-4 h-4 ${c.text}`} />
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </div>
      <span className={`text-xs font-medium mt-1 ${c.text}`}>{scoreLabel}</span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default function ResumeAnalyzer() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    setError(null);
    setResult(null);
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be under 5MB.");
      return;
    }
    setPdfFile(file);
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleAnalyze = async () => {
    if (!pdfFile) {
      setError("Please upload your resume PDF.");
      return;
    }
    if (jobDescription.trim().length < 20) {
      setError("Please paste a job description (minimum 20 characters).");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("jobDescription", jobDescription.trim());

      const response = await fetch("/api/analyze-resume", {
        method: "POST",
        body: formData,
      });

      // Guard against HTML error pages (e.g. route crash returning <!DOCTYPE …>)
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          `Server error (${response.status}). Please restart the dev server and try again.`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Analysis failed. Please try again.");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetAll = () => {
    setPdfFile(null);
    setJobDescription("");
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8 bg-gradient-to-b from-slate-50 to-white rounded-3xl shadow-sm border border-slate-100">
      {/* Page Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-blue-50/80 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
          <Zap className="w-3.5 h-3.5" />
          AI-Powered Analysis
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
          Resume Analyzer
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto text-sm md:text-base">
          Upload your resume and paste the job description to get an instant ATS
          compatibility report powered by Gemini AI.
        </p>
      </div>

      {/* Input Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* PDF Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Resume (PDF)
          </label>

          {pdfFile ? (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {pdfFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(pdfFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => {
                  setPdfFile(null);
                  setResult(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors duration-200 ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
              }`}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={onFileInput}
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Drop your PDF here
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    or click to browse · max 5MB
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Job Description */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Job Description
          </label>
          <Textarea
            placeholder="Paste the full job description here..."
            className="h-[168px] resize-none text-sm leading-relaxed"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
          <p className="text-xs text-gray-400">
            {jobDescription.trim().length} characters
          </p>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-dashed border-slate-200">
        <Button
          onClick={handleAnalyze}
          disabled={isLoading || !pdfFile || jobDescription.trim().length < 20}
          className="flex-1 sm:flex-none sm:px-8 bg-[#435ADA] hover:bg-[#3449c5] text-white font-semibold rounded-xl h-11 transition-all duration-200 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Target className="w-4 h-4 mr-2" />
              Analyze Resume
            </>
          )}
        </Button>

        {(pdfFile || result || jobDescription) && (
          <Button
            variant="outline"
            onClick={resetAll}
            disabled={isLoading}
            className="rounded-xl h-11 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Results Section */}
      {result && (
  		<div className="mt-6 space-y-6 rounded-2xl border border-slate-100 bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Score Cards */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Analysis Results
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <ScoreRing
                score={result.atsScore}
                label="ATS Score"
                color="blue"
                icon={Target}
              />
              <ScoreRing
                score={result.skillMatch}
                label="Skill Match"
                color="emerald"
                icon={CheckCircle2}
              />
              <ScoreRing
                score={result.formattingScore}
                label="Formatting"
                color="violet"
                icon={FileText}
              />
            </div>
          </div>

          {/* Missing Skills */}
          {result.missingSkills.length > 0 && (
            <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-gray-800">Missing Skills</h3>
                <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                  {result.missingSkills.length} gaps
                </span>
              </div>
              <p className="text-xs text-gray-500">
                These skills appear in the job description but were not found in your resume.
              </p>
              <div className="flex flex-wrap gap-2">
                {result.missingSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-xs font-medium bg-white border border-amber-200 text-amber-800 px-3 py-1 rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Improvements */}
          {result.improvements.length > 0 && (
            <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-800">
                  Improvement Suggestions
                </h3>
              </div>
              <ul className="space-y-3">
                {result.improvements.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Re-analyze note */}
          <p className="text-center text-xs text-gray-400">
            Results powered by Gemini AI · Scores are indicative, not guaranteed
          </p>
        </div>
      )}
    </div>
  );
}
