import React from "react";
import { Document, Page, Text, View, Link } from "@react-pdf/renderer";
import { TailoringRun } from "../schemas/tailoring-run";
import { pdfStyles } from "./styles";

interface TailoredResumeTemplateProps {
  runData: TailoringRun;
}

export default function TailoredResumeTemplate({ runData }: TailoredResumeTemplateProps) {
  const { originalResume, tailoredResume } = runData;
  const { contact, education, certifications } = originalResume;
  const { tailoredSummary, tailoredSkills, tailoredExperience, tailoredProjects } = tailoredResume;

  // Formatting link text nicely
  const getCleanUrlText = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname + parsed.pathname.replace(/\/$/, "");
    } catch {
      return url;
    }
  };

  return (
    <Document title={`${contact.fullName} - Tailored Resume`} author="Resume Shapeshifter">
      <Page size="LETTER" style={pdfStyles.portraitPage}>
        {/* Name and Header Title */}
        <View style={{ alignItems: "center", marginBottom: 6 }}>
          <Text style={pdfStyles.h1}>{contact.fullName}</Text>
        </View>

        {/* Contact Metadata Row */}
        <View style={pdfStyles.contactRow}>
          {contact.email && (
            <View style={pdfStyles.contactItem}>
              <Text>{contact.email}</Text>
            </View>
          )}
          {contact.phone && (
            <View style={pdfStyles.contactItem}>
              {contact.email && <Text style={pdfStyles.bulletSpacer}>•</Text>}
              <Text>{contact.phone}</Text>
            </View>
          )}
          {contact.location && (
            <View style={pdfStyles.contactItem}>
              {(contact.email || contact.phone) && <Text style={pdfStyles.bulletSpacer}>•</Text>}
              <Text>{contact.location}</Text>
            </View>
          )}
        </View>

        {/* Social / External Links Row */}
        {contact.links && contact.links.length > 0 && (
          <View style={[pdfStyles.contactRow, { marginBottom: 14 }]}>
            {contact.links.map((linkStr, idx) => (
              <View key={idx} style={pdfStyles.contactItem}>
                {idx > 0 && <Text style={pdfStyles.bulletSpacer}>•</Text>}
                <Link
                  src={linkStr}
                  style={{ color: "#4f46e5", textDecoration: "underline" }}
                >
                  {getCleanUrlText(linkStr)}
                </Link>
              </View>
            ))}
          </View>
        )}

        {/* Professional Summary Section */}
        {tailoredSummary && (
          <View style={{ marginBottom: 12 }}>
            <Text style={pdfStyles.h2}>Professional Summary</Text>
            <Text style={pdfStyles.body}>{tailoredSummary}</Text>
          </View>
        )}

        {/* Technical Skills Section */}
        {tailoredSkills && tailoredSkills.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={pdfStyles.h2}>Core Competencies & Skills</Text>
            <Text style={pdfStyles.body}>
              {tailoredSkills.join("  •  ")}
            </Text>
          </View>
        )}

        {/* Professional Experience Section */}
        {tailoredExperience && tailoredExperience.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={pdfStyles.h2}>Professional Experience</Text>
            {tailoredExperience.map((exp, idx) => (
              <View key={idx} style={pdfStyles.sectionItem}>
                {/* Job Title and Date */}
                <View style={pdfStyles.itemHeaderRow}>
                  <Text style={pdfStyles.itemTitle}>
                    {exp.title}
                  </Text>
                  <Text style={pdfStyles.itemDateRange}>
                    {exp.startDate} – {exp.endDate}
                  </Text>
                </View>

                {/* Company Name and Location */}
                <View style={[pdfStyles.itemHeaderRow, { marginBottom: 4 }]}>
                  <Text style={pdfStyles.itemCompany}>
                    {exp.company}
                  </Text>
                  {exp.location && (
                    <Text style={[pdfStyles.metaText, { fontStyle: "italic" }]}>
                      {exp.location}
                    </Text>
                  )}
                </View>

                {/* Experience Bullets */}
                {exp.bullets && exp.bullets.map((bullet, bulletIdx) => (
                  <View key={bulletIdx} style={pdfStyles.bulletRow}>
                    <Text style={pdfStyles.bulletPoint}>•</Text>
                    <Text style={pdfStyles.bulletContent}>
                      {bullet.tailored}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Projects Section */}
        {tailoredProjects && tailoredProjects.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={pdfStyles.h2}>Key Projects</Text>
            {tailoredProjects.map((proj, idx) => (
              <View key={idx} style={pdfStyles.sectionItem}>
                <View style={pdfStyles.itemHeaderRow}>
                  <Text style={pdfStyles.itemTitle}>
                    {proj.name}
                  </Text>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <Text style={[pdfStyles.metaText, { color: "#475569" }]}>
                      [{proj.technologies.join(", ")}]
                    </Text>
                  )}
                </View>

                {proj.description && (
                  <Text style={[pdfStyles.body, { marginBottom: 3, marginTop: 1 }]}>
                    {proj.description}
                  </Text>
                )}

                {/* Project Bullets */}
                {proj.bullets && proj.bullets.map((bullet, bulletIdx) => (
                  <View key={bulletIdx} style={pdfStyles.bulletRow}>
                    <Text style={pdfStyles.bulletPoint}>•</Text>
                    <Text style={pdfStyles.bulletContent}>
                      {bullet.tailored}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Education Section */}
        {education && education.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={pdfStyles.h2}>Education</Text>
            {education.map((edu, idx) => (
              <View key={idx} style={pdfStyles.sectionItem}>
                <View style={pdfStyles.itemHeaderRow}>
                  <Text style={pdfStyles.itemTitle}>
                    {edu.degree}
                    {edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}
                  </Text>
                  <Text style={pdfStyles.itemDateRange}>
                    Graduated {edu.graduationDate}
                  </Text>
                </View>
                <View style={pdfStyles.itemHeaderRow}>
                  <Text style={pdfStyles.itemCompany}>{edu.institution}</Text>
                  {edu.gpa && (
                    <Text style={pdfStyles.metaText}>GPA: {edu.gpa}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Certifications Section */}
        {certifications && certifications.length > 0 && (
          <View>
            <Text style={pdfStyles.h2}>Certifications</Text>
            <Text style={pdfStyles.body}>
              {certifications.join("  •  ")}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
