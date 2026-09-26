# Question Bank and Quiz

This context defines how assessable physics content moves from a community proposal to a learner-facing quiz.

## Language

**Question Submission**:
A community proposal for one assessable question. It is input for editorial work and is not yet a Question.
_Avoid_: Published question, approved question

**Question Draft**:
A versioned Question that may be incomplete or unreviewed and is never eligible for a production quiz.
_Avoid_: Submission, published question

**Review Attestation**:
A named human review decision for one dimension of one exact Question version and content fingerprint.
_Avoid_: PR approval, Issue label, review status

**Published Question**:
A Question with current physics, pedagogy, and copyright Review Attestations. It is eligible for production selection but does not by itself activate a quiz page.
_Avoid_: Live quiz, accepted submission

**Quiz Set**:
The reusable quiz contract that defines question selection rules, fixed questions or constraint queries, time limits, and composition constraints.
_Avoid_: Quiz Blueprint, test paper, page quiz

**Placement**:
The page-level `assessments:` declaration that embeds or links reusable Quiz Sets into markdown documentation.
_Avoid_: Activated quiz, quiz blueprint

**Attempt**:
One browser-local record of answers and results for a selected set of Questions.
_Avoid_: Account, profile, exam result

**Free-response Question**:
A Question whose response is written text rather than selected from fixed choices or entered as a numeric value. It can be used for explanations, derivations, and extended-answer prompts.
_Avoid_: Essay question, manual question

**Self-assessment**:
An evaluation mode in which the learner compares a response with the reference answer and rubric, then records a learning level. It is not an objective correctness judgment.
_Avoid_: Automatic grading, self-correction

**Rubric**:
The published criteria and levels that guide a learner's Self-assessment for a Free-response Question.
_Avoid_: Answer key, model answer

**Reference answer**:
A worked answer or explanation shown to support a learner's Self-assessment. It describes expected reasoning without claiming that only one exact text is correct.
_Avoid_: Correct answer
