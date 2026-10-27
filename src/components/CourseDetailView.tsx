/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  Link2,
  ListChecks,
  Menu,
  MoreVertical,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  Course,
  CourseActivityItem,
  LocalDocument,
  LocalDocumentChunk,
  PersonalNote,
} from '../types/lms';
import { calculateCourseCompletionStats } from '../utils/lmsLogic';
import { formatFileSize, validateAndIngestDocument } from '../utils/documentParser';
import { FormattedText } from './FormattedText';

interface CourseDetailViewProps {
  course: Course;
  initialActiveItemId?: string | null;
  documents: LocalDocument[];
  chunks: LocalDocumentChunk[];
  notes: PersonalNote[];
  onToggleItemDone: (courseId: string, sectionId: string, itemId: string) => void;
  onImportDocument: (params: {
    courseId: string;
    title: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    rawText: string;
    blobDataUrl?: string;
    wordCount?: number;
    readabilityStatus?: LocalDocument['readabilityStatus'];
    ingestionWarnings?: string[];
  }) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
  onSaveNote: (note: {
    id?: string;
    courseId: string;
    activityItemId?: string;
    title: string;
    content: string;
  }) => void;
  onDeleteNote: (noteId: string) => void;
  onAskGemmaAboutTopic: (prompt: string, courseId: string) => void;
  onBackToCourses: () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  course,
  initialActiveItemId,
  documents,
  chunks,
  notes,
  onToggleItemDone,
  onImportDocument,
  onDeleteDocument,
  onSaveNote,
  onDeleteNote,
  onAskGemmaAboutTopic,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'sec-dbms-general': true, // Matches Screenshot 3 where General is above and ER Diagram, Keys, SQL Commands are expanded
  });
  const [activeItem, setActiveItem] = useState<CourseActivityItem | null>(() => {
    if (!initialActiveItemId) return null;
    for (const sec of course.sections) {
      const found = sec.items.find((i) => i.id === initialActiveItemId);
      if (found) return found;
    }
    return null;
  });

  // Quiz interactive state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Course Material Import & Reader state
  const [activeDoc, setActiveDoc] = useState<LocalDocument | null>(null);
  const [activeDocViewMode, setActiveDocViewMode] = useState<'content' | 'chunks'>('content');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialText, setMaterialText] = useState('');
  const [materialStatusMsg, setMaterialStatusMsg] = useState<string | null>(null);
  const [materialErrorMsg, setMaterialErrorMsg] = useState<string | null>(null);

  // Personal note form state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const courseDocuments = documents.filter((d) => d.courseId === course.id);
  const courseNotes = notes.filter((n) => n.courseId === course.id);
  const stats = calculateCourseCompletionStats(course);

  const handleOpenItem = (item: CourseActivityItem) => {
    setActiveItem(item);
    setSelectedAnswers({});
    setQuizSubmitted(false);
  };

  const handleCourseFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMaterialErrorMsg(null);
    setMaterialStatusMsg(null);

    const arrayBuf = await file.arrayBuffer();
    const validation = validateAndIngestDocument({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      bytes: new Uint8Array(arrayBuf),
    });

    if (!validation.valid) {
      setMaterialErrorMsg(
        validation.rejectionReason ?? `Validation failed for "${file.name}".`
      );
      e.target.value = '';
      return;
    }

    let blobDataUrl: string | undefined;
    if (validation.normalizedMimeType === 'application/pdf') {
      blobDataUrl = await readFileAsDataUrl(file);
    }

    await onImportDocument({
      courseId: course.id,
      title: materialTitle.trim() || file.name.replace(/\.[^.]+$/, ''),
      fileName: file.name,
      mimeType: validation.normalizedMimeType,
      sizeBytes: file.size,
      rawText: validation.extractedText,
      blobDataUrl,
      wordCount: validation.wordCount,
      readabilityStatus: validation.readabilityStatus,
      ingestionWarnings: validation.warnings,
    });

    setMaterialTitle('');
    setMaterialStatusMsg(
      `Validated & ingested "${file.name}" (${validation.wordCount} words, status: ${validation.readabilityStatus.replace(/_/g, ' ')}) into local IndexedDB for ${course.title} (Local only — not uploaded to college server).`
    );
    e.target.value = '';
  };

  const handleManualMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMaterialErrorMsg(null);
    setMaterialStatusMsg(null);

    if (!materialTitle.trim() || !materialText.trim()) {
      setMaterialErrorMsg('Please provide both a document title and readable text content.');
      return;
    }
    const raw = materialText.trim();
    const safeFile = `${materialTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}.txt`;
    const encoded = new TextEncoder().encode(raw);

    const validation = validateAndIngestDocument({
      fileName: safeFile,
      mimeType: 'text/plain',
      sizeBytes: encoded.byteLength,
      rawText: raw,
    });

    if (!validation.valid) {
      setMaterialErrorMsg(validation.rejectionReason ?? 'Document validation failed.');
      return;
    }

    await onImportDocument({
      courseId: course.id,
      title: materialTitle.trim(),
      fileName: safeFile,
      mimeType: validation.normalizedMimeType,
      sizeBytes: encoded.byteLength,
      rawText: validation.extractedText,
      wordCount: validation.wordCount,
      readabilityStatus: validation.readabilityStatus,
      ingestionWarnings: validation.warnings,
    });

    setMaterialTitle('');
    setMaterialText('');
    setMaterialStatusMsg(
      `Validated & saved "${safeFile}" (${validation.wordCount} words) to local IndexedDB for ${course.title} (Local only — not uploaded to college server).`
    );
  };

  const handleDeleteCourseDoc = async (doc: LocalDocument) => {
    await onDeleteDocument(doc.id);
    if (activeDoc?.id === doc.id) {
      setActiveDoc(null);
    }
    setMaterialErrorMsg(null);
    setMaterialStatusMsg(`Removed local document "${doc.fileName}" and its RAG chunks from IndexedDB.`);
  };

  const handleCreateNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    onSaveNote({
      courseId: course.id,
      activityItemId: activeItem?.id,
      title: noteTitle,
      content: noteContent,
    });
    setNoteTitle('');
    setNoteContent('');
  };

  return (
    <div className="min-h-[calc(100vh-62px)] flex bg-white relative">
      {/* Left Collapsible Course Index Sidebar matching Screenshot 3 */}
      {sidebarOpen ? (
        <aside
          aria-label="Course Index Sidebar"
          className="w-[272px] shrink-0 border-r border-[#dee2e6] bg-[#f8f9fa] flex flex-col h-[calc(100vh-62px)] sticky top-[62px]"
        >
          {/* Sidebar top controls: 'X' on left, ':' menu on right */}
          <div className="h-12 px-4 flex items-center justify-between border-b border-slate-200/80">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close course index"
              className="p-1.5 rounded-md text-slate-700 hover:bg-slate-200/70 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-500 truncate px-2">
              {course.title}
            </span>
            <button
              type="button"
              onClick={() => setCollapsedSections({})}
              aria-label="Expand all course sections"
              title="Expand all sections"
              className="p-1.5 rounded-md text-slate-700 hover:bg-slate-200/70 cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Course Index Tree */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {course.sections.map((section) => {
              const isCollapsed = !!collapsedSections[section.id];
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-1.5 py-1.5 px-1.5 text-left text-[13px] font-bold text-[#2b3035] hover:bg-slate-200/60 rounded-md cursor-pointer"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <span className="truncate">{section.title}</span>
                  </button>

                  {!isCollapsed && (
                    <ul className="mt-1 space-y-1 pl-2">
                      {section.items.map((item) => {
                        const isSelected = activeItem?.id === item.id;
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => handleOpenItem(item)}
                              className={`w-full flex items-center gap-2.5 py-1.5 px-2 rounded-md text-left text-[12.5px] transition cursor-pointer ${
                                isSelected
                                  ? 'bg-[#0f6b3e]/10 text-[#0f6b3e] font-semibold'
                                  : 'text-[#495057] hover:bg-slate-200/60'
                              }`}
                            >
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  item.done
                                    ? 'bg-[#196735]'
                                    : 'border-2 border-slate-400 bg-transparent'
                                }`}
                                aria-hidden="true"
                              />
                              <span className="truncate">{item.title}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      ) : (
        <div className="fixed left-3 top-[76px] z-30">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open course index drawer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-r-full bg-[#f8f9fa] border border-[#dee2e6] shadow-xs text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <Menu className="w-4 h-4 text-[#0f6b3e]" />
            <span>Course Index</span>
          </button>
        </div>
      )}

      {/* Main Center Course Content Area matching Screenshot 3 */}
      <main className="flex-1 min-w-0 px-4 sm:px-8 lg:px-12 py-6 max-w-[940px] mx-auto">
        {/* Contextual Header bar above the section cards */}
        <div className="mb-5 pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#1d2125]">{course.title}</h1>
            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-mono tabular-nums">
                Progress: {stats.completedCount}/{stats.totalCount} ({stats.percent}%)
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {course.isSampleData
                  ? 'Sample Baseline Course (Replaceable with Authorized LMS Pack)'
                  : 'Imported Course Pack'}
              </span>
              {stats.localModifiedCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-800 font-medium">
                    {stats.localModifiedCount} Unsynced Local Change(s)
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onAskGemmaAboutTopic(
                `Summarize the key concepts and exam questions in ${course.title}`,
                course.id
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#015303] hover:bg-[#0f6b3e] text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#f6e01c]" />
            Ask Local Gemma 4 Tutor
          </button>
        </div>

        {/* Active Study Item Reader / Interactive Quiz Drawer when an item is clicked */}
        {activeItem && (
          <section
            aria-label={`Active Activity: ${activeItem.title}`}
            className="mb-7 rounded-[12px] border-2 border-[#0f6b3e] bg-[#f8fdf9] p-5 sm:p-6 shadow-xs"
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#cce6d4]">
              <div>
                <div className="text-xs font-medium text-[#0f6b3e]">
                  Offline Activity Reader ·{' '}
                  {activeItem.syncState === 'local_modified'
                    ? 'Modified Locally (Queued for Sync)'
                    : 'Cached Baseline Item'}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">{activeItem.title}</h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onAskGemmaAboutTopic(
                      `Explain "${activeItem.title}" using my local SIET-LMS course documents.`,
                      course.id
                    )
                  }
                  className="px-3 py-1.5 rounded-md bg-white border border-[#0f6b3e]/40 text-xs font-medium text-[#0f6b3e] hover:bg-emerald-50 cursor-pointer"
                >
                  Ask Gemma 4 About This
                </button>
                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  className="px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-200/60 cursor-pointer"
                >
                  Close Reader
                </button>
              </div>
            </div>

            {/* Formatted Educational Content */}
            <div className="mt-4 text-xs sm:text-sm text-slate-800">
              <FormattedText text={activeItem.contentBody} />
            </div>

            {/* Interactive Offline MCQ Practice if item has questions */}
            {activeItem.questions && activeItem.questions.length > 0 && (
              <div className="mt-6 pt-5 border-t border-[#cce6d4] space-y-5">
                <h3 className="text-sm font-bold text-slate-900">
                  Interactive Offline Assessment ({activeItem.questions.length} Question
                  {activeItem.questions.length > 1 ? 's' : ''})
                </h3>

                {activeItem.questions.map((q, qIdx) => {
                  const chosen = selectedAnswers[q.id];
                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-lg bg-white border border-slate-200 space-y-2.5"
                    >
                      <div className="text-sm font-semibold text-slate-900">
                        {qIdx + 1}. {q.prompt}
                      </div>
                      <div className="space-y-1.5">
                        {q.options.map((opt, oIdx) => {
                          const isChosen = chosen === oIdx;
                          const isCorrect = q.correctIndex === oIdx;
                          let optionStyle = 'border-slate-200 hover:bg-slate-50 text-slate-700';
                          if (quizSubmitted) {
                            if (isCorrect) {
                              optionStyle =
                                'border-emerald-500 bg-emerald-50 text-emerald-950 font-medium';
                            } else if (isChosen && !isCorrect) {
                              optionStyle = 'border-red-400 bg-red-50 text-red-900';
                            }
                          } else if (isChosen) {
                            optionStyle =
                              'border-[#0f6b3e] bg-[#0f6b3e]/10 text-slate-900 font-medium';
                          }

                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => {
                                if (!quizSubmitted) {
                                  setSelectedAnswers((prev) => ({ ...prev, [q.id]: oIdx }));
                                }
                              }}
                              className={`w-full text-left px-3.5 py-2 rounded-md border text-xs transition flex items-center justify-between cursor-pointer ${optionStyle}`}
                            >
                              <span>{opt}</span>
                              {quizSubmitted && isCorrect && (
                                <span className="text-[11px] font-bold text-emerald-800">
                                  ✓ Correct
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {quizSubmitted && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setQuizSubmitted(true);
                      if (!activeItem.done) {
                        onToggleItemDone(course.id, activeItem.sectionId, activeItem.id);
                        setActiveItem({ ...activeItem, done: true, syncState: 'local_modified' });
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-[#0f6b3e] hover:bg-[#015303] text-white text-xs font-semibold cursor-pointer"
                  >
                    Check Answers & Save Progress Locally
                  </button>
                  {quizSubmitted && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAnswers({});
                        setQuizSubmitted(false);
                      }}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Retry Quiz
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Section Cards matching Screenshot 3 ("ER Diagram", "Keys", "SQL Commands", "Operators") */}
        <div className="space-y-5">
          {course.sections.map((section) => {
            const isCollapsed = !!collapsedSections[section.id];
            return (
              <section
                key={section.id}
                aria-labelledby={`section-heading-${section.id}`}
                className="bg-white border border-[#dee2e6] rounded-[12px] p-5 sm:p-6"
              >
                {/* Section Header with light-green circular chevron button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={!isCollapsed}
                      aria-label={`Toggle ${section.title} section`}
                      className="w-8 h-8 rounded-full bg-[#dcece2] text-[#0f6b3e] hover:bg-[#cbe3d4] flex items-center justify-center transition shrink-0 cursor-pointer"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <h2
                      id={`section-heading-${section.id}`}
                      className="text-[20px] font-bold text-[#1d2125]"
                    >
                      {section.title}
                    </h2>
                  </div>
                </div>

                {/* Activity Rows inside Section Card */}
                {!isCollapsed && (
                  <div className="mt-4 divide-y divide-[#e9ecef]">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className="py-4 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Icon matching Screenshot 3: teal link icon or magenta quiz checklist icon */}
                          {item.type === 'link' ? (
                            <Link2
                              className="w-[18px] h-[18px] text-[#0f6b3e] shrink-0"
                              aria-hidden="true"
                            />
                          ) : item.type === 'quiz' ? (
                            <div
                              className="w-[20px] h-[20px] rounded-[4px] border-[1.75px] border-[#d63384] text-[#d63384] flex items-center justify-center shrink-0"
                              aria-hidden="true"
                            >
                              <ListChecks className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <FileText
                              className="w-[18px] h-[18px] text-[#0f6b3e] shrink-0"
                              aria-hidden="true"
                            />
                          )}

                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => handleOpenItem(item)}
                              className="text-left text-[14px] text-[#0f6b3e] hover:underline font-normal truncate block cursor-pointer"
                            >
                              {item.title}
                            </button>
                            {item.syncState === 'local_modified' && (
                              <span className="text-[11px] text-amber-800 block mt-0.5">
                                Unsynced Local Change · Saved in IndexedDB
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side "✓ Done v" button matching Screenshot 3 */}
                        <button
                          type="button"
                          onClick={() => onToggleItemDone(course.id, section.id, item.id)}
                          aria-label={`${item.done ? 'Completed' : 'Mark as done'}: ${item.title}`}
                          className={`px-3 py-1.5 rounded-[6px] text-[12.5px] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                            item.done
                              ? 'bg-[#d5e6da] text-[#1d2125] hover:bg-[#c5ddcc]'
                              : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {item.done ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Done</span>
                              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                            </>
                          ) : (
                            <span>Mark as done</span>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Course Materials & Offline Document Management Section (PDF & Text Support) */}
        <section
          aria-labelledby="course-materials-heading"
          className="mt-8 bg-white border border-[#dee2e6] rounded-[12px] p-5 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <FilePlus2 className="w-4 h-4 text-[#0f6b3e]" />
                <h2 id="course-materials-heading" className="text-base font-bold text-[#1d2125]">
                  Course Materials & Local Document Manager ({course.title})
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Import PDF or text documents (`.pdf`, `.txt`, `.md`, `.json`, `.csv`) for offline
                reading. Stored strictly in your browser&apos;s IndexedDB — never simulated as
                uploaded to the college server.
              </p>
            </div>
          </div>

          {materialErrorMsg && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 font-medium"
            >
              Document Ingestion Rejected: {materialErrorMsg}
            </div>
          )}

          {materialStatusMsg && (
            <div
              role="status"
              className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950"
            >
              {materialStatusMsg}
            </div>
          )}

          {/* Import Document Form */}
          <form
            onSubmit={handleManualMaterialSubmit}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 mb-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="course-material-title"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Document Title (Optional for file upload)
                </label>
                <input
                  id="course-material-title"
                  type="text"
                  placeholder="e.g., Unit 2 Relational Algebra Reference"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0f6b3e]"
                />
              </div>

              <div>
                <label
                  htmlFor="course-material-file"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Import Local PDF or Text File (Max 15 MB)
                </label>
                <label
                  htmlFor="course-material-file"
                  className="w-full h-[34px] px-3 rounded-lg border border-dashed border-[#0f6b3e] bg-white hover:bg-emerald-50/40 text-xs font-medium text-[#0f6b3e] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import PDF / TXT / MD / CSV / JSON</span>
                  <input
                    id="course-material-file"
                    type="file"
                    accept=".pdf,.txt,.md,.json,.csv,application/pdf,text/plain,text/markdown,application/json,text/csv"
                    onChange={handleCourseFileUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            <div>
              <label
                htmlFor="course-material-text"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Or Paste Text / Markdown Document Content Directly
              </label>
              <textarea
                id="course-material-text"
                rows={2}
                placeholder="Paste lecture notes or lab instructions to save as an offline course document..."
                value={materialText}
                onChange={(e) => setMaterialText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0f6b3e]"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-[#0f6b3e] hover:bg-[#015303] text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              >
                Save Text Document to Course
              </button>
            </div>
          </form>

          {/* List of Documents Associated with this Course */}
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
            {courseDocuments.length === 0 ? (
              <div className="p-4 text-xs text-slate-500 text-center">
                No documents associated with {course.title} yet.
              </div>
            ) : (
              courseDocuments.map((doc) => {
                const isReading = activeDoc?.id === doc.id;
                const docChunksCount = chunks.filter((c) => c.documentId === doc.id).length || doc.chunkCount;
                const docWords =
                  doc.wordCount ?? doc.rawText.trim().split(/\s+/).filter(Boolean).length;
                const statusLabel =
                  doc.readabilityStatus === 'binary_only_pdf'
                    ? 'Binary/Scanned PDF (Metadata Indexed)'
                    : doc.readabilityStatus === 'partial_pdf_text'
                      ? 'Partial PDF Text Extracted'
                      : 'Verified Readable Text';

                return (
                  <div
                    key={doc.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-[#0f6b3e] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{doc.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                          Filename: {doc.fileName} · {formatFileSize(doc.sizeBytes)} · {docWords}{' '}
                          words · {docChunksCount} RAG chunks · {statusLabel}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Course: {course.title} ·{' '}
                          {doc.isSampleBaseline
                            ? 'Sample Baseline Document (Cached Offline)'
                            : 'Locally Imported Document (Saved in IndexedDB · Not uploaded to server)'}
                        </div>
                        {doc.ingestionWarnings && doc.ingestionWarnings.length > 0 && (
                          <div className="text-[11px] text-amber-800 mt-0.5">
                            Note: {doc.ingestionWarnings.join(' ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (isReading) {
                            setActiveDoc(null);
                          } else {
                            setActiveDoc(doc);
                            setActiveDocViewMode('content');
                          }
                        }}
                        className="px-3 py-1.5 rounded-md border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {isReading ? 'Close Document' : 'Open / Read'}
                      </button>
                      {!doc.isSampleBaseline && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCourseDoc(doc)}
                          aria-label={`Remove imported document ${doc.fileName}`}
                          className="px-2.5 py-1.5 rounded-md border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Active Offline Document Reader (Supports PDF embed, Formatted Text & RAG Chunk Inspector) */}
          {activeDoc && (
            <div className="mt-4 p-4 rounded-xl border-2 border-[#0f6b3e] bg-slate-50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{activeDoc.title}</h3>
                  <div className="text-[11px] font-mono tabular-nums text-slate-500">
                    {activeDoc.fileName} · {activeDoc.mimeType} · Associated with {course.title}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveDocViewMode('content')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                      activeDocViewMode === 'content'
                        ? 'bg-[#0f6b3e] text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Formatted Content
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDocViewMode('chunks')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                      activeDocViewMode === 'chunks'
                        ? 'bg-[#0f6b3e] text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    RAG Chunks (
                    {chunks.filter((c) => c.documentId === activeDoc.id).length ||
                      activeDoc.chunkCount}
                    )
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDoc(null)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-200 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Close Reader
                  </button>
                </div>
              </div>

              {activeDocViewMode === 'content' ? (
                <>
                  {activeDoc.mimeType === 'application/pdf' && activeDoc.blobDataUrl && (
                    <div className="w-full h-[420px] rounded-lg overflow-hidden border border-slate-300 bg-white">
                      <iframe
                        src={activeDoc.blobDataUrl}
                        title={`Offline PDF Viewer: ${activeDoc.fileName}`}
                        className="w-full h-full"
                      />
                    </div>
                  )}

                  <div className="p-3.5 rounded-lg bg-white border border-slate-200 max-h-[340px] overflow-y-auto text-xs text-slate-800">
                    <FormattedText text={activeDoc.rawText} />
                  </div>
                </>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto">
                  {chunks
                    .filter((c) => c.documentId === activeDoc.id)
                    .map((chunk) => (
                      <div
                        key={chunk.id}
                        className="p-3 rounded-lg bg-white border border-slate-200 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-slate-500">
                          <span className="font-bold text-[#0f6b3e]">
                            Chunk #{chunk.chunkIndex + 1}: {chunk.heading}
                          </span>
                          <span className="tabular-nums">
                            chars {chunk.charStart ?? 0}–{chunk.charEnd ?? chunk.text.length} ·{' '}
                            {chunk.tokenCount} tokens
                          </span>
                        </div>
                        <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {chunk.text}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Offline Personal Study Notes Section for this Course */}
        <section
          aria-labelledby="course-notes-heading"
          className="mt-8 bg-white border border-[#dee2e6] rounded-[12px] p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 id="course-notes-heading" className="text-base font-bold text-[#1d2125]">
                Personal Offline Study Notes ({course.title})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Stored persistently in your local IndexedDB database. Preserved even when
                synchronization is unavailable.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateNoteSubmit} className="space-y-3 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="note-title-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Note Title
                </label>
                <input
                  id="note-title-input"
                  type="text"
                  placeholder="e.g., BCNF vs 3NF Normalization Checklist"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0f6b3e]"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#0f6b3e] hover:bg-[#015303] text-white text-xs font-semibold cursor-pointer"
                >
                  Save Note to Local IndexedDB
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor="note-content-input"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Study Note Content
              </label>
              <textarea
                id="note-content-input"
                rows={3}
                placeholder="Write formulas, SQL snippets, or revision reminders..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0f6b3e]"
              />
            </div>
          </form>

          {courseNotes.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">
              No personal notes saved for this course yet. Add a note above to store it offline.
            </p>
          ) : (
            <div className="divide-y divide-slate-200">
              {courseNotes.map((note) => (
                <div key={note.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900">{note.title}</div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                    <div className="text-[11px] text-slate-500">
                      Updated {new Date(note.updatedAt).toLocaleString('en-IN')} ·{' '}
                      {note.syncState === 'local_modified'
                        ? 'Local Only (Unsynced)'
                        : 'Baseline Sample Note'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteNote(note.id)}
                    aria-label={`Delete note ${note.title}`}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
