# Context: the exam domain

Load this when working on content tagging, the data model, retrieval filters,
or anything that has to know what a "level" or a "group" means.

## Two exams, not one

"Loksewa agriculture" is two structurally different examinations. Most existing
tools blur them, and that blurring is itself one of the problems this project
exists to fix.

### Level 4 - Junior Technical Assistant (JTA)

- Diploma / certificate-level technical post.
- Two papers. Heavier on field and practical technical content.
- Service groups include Agronomy, Horticulture, Agri-Extension, Soil Science,
  and Agri-Economics & Marketing.

### Level 7 - Officer (Sakha Adhikrit)

- Requires B.Sc. Ag or an equivalent degree.
- Paper 1: objective MCQ - general knowledge, agriculture science, current
  affairs.
- Paper 2: subjective - technical questions and case-study problem solving.
- Followed by an interview.
- Agriculture and Veterinary are distinct groups at this level.

**Implication for the system:** an officer-level policy or administration
question is the wrong depth for a JTA candidate, and a JTA field-practice
question is the wrong depth for an officer candidate. Level is a hard filter on
retrieval, not a display hint.

## Eight authorities, not one

Curricula are published by the **federal** Public Service Commission
(psc.gov.np) *and* by **seven separate Provincial Public Service Commissions**
(Koshi, Madhesh, Bagmati, Gandaki, Lumbini, Karnali, Sudurpaschim). Each
publishes its own curriculum PDFs for a nominally identical post, on its own
portal, with no cross-linking.

**Implication:** province is a first-class dimension alongside level and
service group. A curriculum is only correct for the province that published it.
Never present a Gandaki curriculum to a Lumbini candidate as if it were theirs.

## The source landscape moves

The ministry responsible for agriculture policy was restructured in 2026, and
curricula are revised without announcement. This is the core argument for a
crawler with change detection rather than a static content dump, and for
stamping every syllabus page with a "last verified on" date.

**Implication:** nothing hardcodes a ministry name, a URL, or a syllabus
version. Sources live in `data/sources/whitelist.yml`; currency is data, not
code.

## Stakes

A vacancy for a specific post and province can be years apart. A wrong
memorised fact does not cost a few marks - it can cost a cycle. This is why
human review is mandatory before anything is marked verified, and why
faithfulness regressions block merges.

## Verify before you encode

Every factual claim above came from project research and can go stale. Before
encoding any of it as a constant, an enum or a schema default, check it against
the current official notice. Treat this file as orientation, not as a source of
truth for the product.
