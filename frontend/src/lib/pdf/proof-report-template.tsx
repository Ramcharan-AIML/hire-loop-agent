import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { TailoringRun } from "../schemas/tailoring-run";
import { pdfStyles, colors } from "./styles";
import { computeWordDiff } from "./diff-engine";

interface ProofReportTemplateProps {
  runData: TailoringRun;
}

export default function ProofReportTemplate({ runData }: ProofReportTemplateProps) {
  const {
    originalResume,
    jobDescription,
    originalMatch,
    tailoredMatch,
    tailoredResume,
    gapAnalysis,
  } = runData;

  const scoreDiff = tailoredMatch.overallScore - originalMatch.overallScore;

  // Helper to render inline word diff text for React-PDF
  const renderPdfDiffText = (original: string, tailored: string) => {
    if (original === tailored) {
      return <Text style={pdfStyles.bulletContent}>{tailored}</Text>;
    }

    const segments = computeWordDiff(original, tailored);

    return (
      <Text style={pdfStyles.bulletContent}>
        {segments.map((seg, idx) => {
          if (seg.type === "added") {
            return (
              <Text key={idx} style={pdfStyles.diffAdded}>
                {seg.value}
              </Text>
            );
          }
          if (seg.type === "removed") {
            return (
              <Text key={idx} style={pdfStyles.diffRemoved}>
                {seg.value}
              </Text>
            );
          }
          return <Text key={idx}>{seg.value}</Text>;
        })}
      </Text>
    );
  };

  return (
    <Document title={`${originalResume.contact.fullName} - Tailoring Proof Report`} author="Resume Shapeshifter">
      <Page size="LETTER" orientation="landscape" style={pdfStyles.landscapePage}>
        {/* Landscape Header */}
        <View style={pdfStyles.proofHeader}>
          <View>
            <Text style={pdfStyles.proofTitle}>RESUME SHAPESHIFTER — PROOF REPORT</Text>
            <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
              Target Role: <Text style={pdfStyles.bold}>{jobDescription.jobTitle}</Text> at <Text style={pdfStyles.bold}>{jobDescription.company}</Text>
            </Text>
          </View>
          <View style={pdfStyles.proofMeta}>
            <Text>Candidate: {originalResume.contact.fullName}</Text>
            <Text style={{ marginTop: 2 }}>Date: {new Date(runData.timestamp).toLocaleDateString()}</Text>
          </View>
        </View>

        {/* Score Comparison Display Block */}
        <View style={pdfStyles.scoreBlock}>
          <View style={[pdfStyles.scoreGauge, { borderRightWidth: 1, borderRightColor: colors.borderLight }]}>
            <Text style={{ fontSize: 7, color: colors.textLight, textTransform: "uppercase" }}>Original Score</Text>
            <Text style={[pdfStyles.scoreVal, { color: colors.danger }]}>{originalMatch.overallScore}%</Text>
          </View>
          <View style={[pdfStyles.scoreGauge, { borderRightWidth: 1, borderRightColor: colors.borderLight, paddingLeft: 16 }]}>
            <Text style={{ fontSize: 7, color: colors.textLight, textTransform: "uppercase" }}>Tailored Score</Text>
            <Text style={[pdfStyles.scoreVal, { color: colors.success }]}>{tailoredMatch.overallScore}%</Text>
          </View>
          <View style={pdfStyles.scoreGauge}>
            <Text style={{ fontSize: 7, color: colors.textLight, textTransform: "uppercase" }}>Relevance Lift</Text>
            <Text style={[pdfStyles.scoreVal, { color: colors.accent }]}>+{scoreDiff}%</Text>
          </View>
          <Text style={pdfStyles.scoreExplanation}>
            <Text style={pdfStyles.bold}>Match Explanation: </Text>
            {tailoredMatch.explanation || "Your resume bullets were rephrased to align directly with job criteria."}
          </Text>
        </View>

        {/* Section Header: Bullet Optimization Logs */}
        <Text style={pdfStyles.h2}>Bullet Optimization Logs (Original vs Tailored)</Text>

        {/* Map through optimized experience items */}
        {tailoredResume.tailoredExperience && tailoredResume.tailoredExperience.map((exp, expIdx) => {
          // Verify if this company has modified bullets to show
          const hasModifiedBullets = exp.bullets && exp.bullets.some(b => b.original !== b.tailored);
          
          return (
            <View key={expIdx} wrap={false} style={{ marginBottom: 12 }}>
              {/* Experience Company Header */}
              <View style={{ backgroundColor: "#f1f5f9", paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, marginBottom: 4 }}>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>
                  {exp.company} — {exp.title}
                </Text>
              </View>

              {/* Table Column Labels */}
              <View style={{ flexDirection: "row", paddingHorizontal: 4, paddingVertical: 2, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                <Text style={{ width: "48%", fontSize: 7.5, fontWeight: "bold", color: colors.textLight }}>ORIGINAL BULLETS</Text>
                <Text style={{ width: "4%", textAlign: "center" }} />
                <Text style={{ width: "48%", fontSize: 7.5, fontWeight: "bold", color: colors.textLight }}>TAILORED BULLETS (WITH HIGHLIGHTED CHANGES)</Text>
              </View>

              {/* Loop through Bullets */}
              {exp.bullets && exp.bullets.map((bullet, bulletIdx) => (
                <View key={bulletIdx} style={pdfStyles.rowGrid}>
                  {/* Left Column: Original */}
                  <View style={pdfStyles.colOriginal}>
                    <View style={{ flexDirection: "row" }}>
                      <Text style={{ width: 8, fontSize: 8 }}>•</Text>
                      <Text style={{ flex: 1, fontSize: 8, color: colors.textLight }}>{bullet.original}</Text>
                    </View>
                  </View>

                  {/* Middle Column: Arrow Spacer */}
                  <View style={pdfStyles.colSpacer}>
                    <Text style={{ fontSize: 10, color: colors.border }}>→</Text>
                  </View>

                  {/* Right Column: Tailored with Diff */}
                  <View style={pdfStyles.colTailored}>
                    <View style={{ flexDirection: "row" }}>
                      <Text style={{ width: 8, fontSize: 8 }}>•</Text>
                      {renderPdfDiffText(bullet.original, bullet.tailored)}
                    </View>

                    {/* Metadata Sub-Row */}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4, paddingLeft: 8 }}>
                      {/* Reason Badge */}
                      <Text style={{ fontSize: 7, color: colors.textMuted }}>
                        <Text style={pdfStyles.bold}>Reason: </Text>{bullet.changeReason}
                      </Text>

                      {/* Confidence Badge */}
                      <View style={[
                        pdfStyles.metaBadge,
                        {
                          backgroundColor: bullet.confidence === "high" ? "#d1fae5" : bullet.confidence === "medium" ? "#fef3c7" : "#ffe4e6",
                          color: bullet.confidence === "high" ? "#065f46" : bullet.confidence === "medium" ? "#92400e" : "#9f1239"
                        }
                      ]}>
                        <Text style={{ fontSize: 6, fontWeight: "bold", textTransform: "uppercase" }}>
                          {bullet.confidence} confidence
                        </Text>
                      </View>

                      {/* Risk Banner (if present) */}
                      {bullet.riskFlag && (
                        <View style={[pdfStyles.metaBadge, { backgroundColor: "#fee2e2", color: "#991b1b" }]}>
                          <Text style={{ fontSize: 6, fontWeight: "bold" }}>
                            ⚠️ RISK: {bullet.riskFlag}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        {/* Section Header: Unresolved Skill Gaps */}
        {gapAnalysis && gapAnalysis.gaps && gapAnalysis.gaps.length > 0 && (
          <View wrap={false} style={{ marginTop: 14 }}>
            <Text style={pdfStyles.h2}>Actionable Interview Preparation & Gap Analysis</Text>
            <Text style={{ fontSize: 8, color: colors.textMuted, marginBottom: 6 }}>
              The following job criteria could not be safely woven into your resume without fabricating credentials. Prepare to address these gaps during interviews.
            </Text>

            {gapAnalysis.gaps.map((gap, gapIdx) => (
              <View key={gapIdx} style={pdfStyles.gapItem}>
                <View style={{ flex: 1, paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primary }}>
                    {gap.name} 
                    <Text style={{ fontSize: 7, fontWeight: "bold", color: gap.importance === "high" ? colors.danger : colors.warning }}>
                      {" "}({gap.importance.toUpperCase()} IMPORTANCE)
                    </Text>
                  </Text>
                  <Text style={{ fontSize: 7.5, color: colors.textMuted, marginTop: 1 }}>
                    <Text style={pdfStyles.bold}>JD Requirement: </Text>"{gap.jdEvidence}"
                  </Text>
                  <Text style={{ fontSize: 7.5, color: colors.textLight }}>
                    <Text style={pdfStyles.bold}>Resume Status: </Text>{gap.resumeEvidence}
                  </Text>
                  <Text style={{ fontSize: 8, color: colors.accentSecondary, marginTop: 2 }}>
                    <Text style={pdfStyles.bold}>Interview Strategy: </Text>{gap.suggestedAction}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Ethical Footer Disclaimer */}
        <View style={pdfStyles.disclaimer}>
          <Text>
            Factual Integrity Notice: Resume Shapeshifter operates under a zero-fabrication safety standard. This document is a semantic alignment audit, not a credential generator. The candidate is legally and ethically responsible for reviewing, validating, and confirming all claims prior to job submission.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
