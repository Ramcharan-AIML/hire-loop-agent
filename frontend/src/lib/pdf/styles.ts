import { StyleSheet } from "@react-pdf/renderer";

// Premium corporate light theme colors for PDFs
export const colors = {
  primary: "#000000",       // Pure black
  textMuted: "#1e293b",     // slate-800 (High-contrast sharp text)
  textLight: "#475569",     // slate-600 (Legible dates/metadata)
  border: "#94a3b8",        // slate-400 (High-contrast divider lines)
  borderLight: "#cbd5e1",   // slate-300 (Subtle borders)
  accent: "#4f46e5",        // indigo-600
  accentSecondary: "#000000", // Pure black section headers (removes teal-green)
  
  // Highlight blocks for diff changes
  addedBg: "#d1fae5",       // emerald-100
  addedText: "#064e3b",     // emerald-900
  removedBg: "#ffe4e6",     // rose-100
  removedText: "#9f1239",   // rose-800
  
  // Alert colors
  success: "#059669",       // emerald-600
  danger: "#dc2626",        // red-600
  warning: "#d97706",       // amber-600
  warningBg: "#fef3c7",     // amber-100
};

export const pdfStyles = StyleSheet.create({
  // Base Page & Document
  portraitPage: {
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.4,
    color: colors.primary,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48, // Standard Letter margins (~0.67" to 0.75" sides)
    backgroundColor: "#ffffff",
  },
  landscapePage: {
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.35,
    color: colors.primary,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    backgroundColor: "#ffffff",
  },

  // Typography
  h1: {
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: -0.5,
    color: colors.primary,
    marginBottom: 4,
  },
  h2: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.accentSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 3,
    marginTop: 14,
    marginBottom: 8,
  },
  h3: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
  },
  body: {
    fontSize: 9.5,
    color: colors.textMuted,
    marginBottom: 4,
  },
  bold: {
    fontWeight: "bold",
  },
  italic: {
    fontStyle: "italic",
  },
  metaText: {
    fontSize: 8.5,
    color: colors.textLight,
  },

  // Contact / Header Section
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    fontSize: 8.5,
    color: colors.textMuted,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  bulletSpacer: {
    color: colors.border,
    marginHorizontal: 4,
  },

  // Lists & Bullets
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3.5,
    paddingLeft: 4,
  },
  bulletPoint: {
    width: 10,
    fontSize: 9.5,
    color: colors.textMuted,
  },
  bulletContent: {
    flex: 1,
    fontSize: 9.5,
    color: colors.textMuted,
  },

  // Experience & Education items
  sectionItem: {
    marginBottom: 8,
  },
  itemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 10.5,
    fontWeight: "bold",
    color: colors.primary,
  },
  itemCompany: {
    fontSize: 9.5,
    color: colors.textMuted,
  },
  itemDateRange: {
    fontSize: 8.5,
    color: colors.textLight,
    textAlign: "right",
  },

  // Diff Engine highlight boxes for PDF
  diffAdded: {
    backgroundColor: colors.addedBg,
    color: colors.addedText,
    fontWeight: "bold",
  },
  diffRemoved: {
    backgroundColor: colors.removedBg,
    color: colors.removedText,
    textDecoration: "line-through",
  },
  diffUnchanged: {},

  // Grid/Flex elements for Side-by-Side Proof PDF
  proofHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingBottom: 6,
    marginBottom: 10,
  },
  proofTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
  },
  proofMeta: {
    fontSize: 8.5,
    color: colors.textLight,
    textAlign: "right",
  },
  
  // Score comparison block
  scoreBlock: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc", // slate-50
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 8,
    marginBottom: 10,
  },
  scoreGauge: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  scoreVal: {
    fontSize: 16,
    fontWeight: "bold",
  },
  scoreExplanation: {
    flex: 1,
    fontSize: 8,
    color: colors.textMuted,
    borderLeftWidth: 1,
    borderLeftColor: colors.borderLight,
    paddingLeft: 10,
    marginLeft: 10,
    lineHeight: 1.3,
  },

  // Side-by-side comparative bullet columns
  rowGrid: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: 6,
  },
  colOriginal: {
    width: "48%",
    paddingRight: 10,
  },
  colSpacer: {
    width: "4%",
    alignItems: "center",
    justifyContent: "center",
  },
  colTailored: {
    width: "48%",
    paddingLeft: 10,
  },
  metaBadge: {
    fontSize: 7.5,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  
  // Gaps listing
  gapItem: {
    flexDirection: "row",
    marginBottom: 4,
    backgroundColor: "#fffbeb", // amber-50/10
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    padding: 4,
    borderRadius: 2,
  },

  // Footer Disclaimer
  disclaimer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: colors.textLight,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 4,
    textAlign: "center",
  },
});
