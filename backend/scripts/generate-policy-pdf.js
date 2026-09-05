const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'public', 'policies');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const doc = new PDFDocument({ margin: 50 });
const stream = fs.createWriteStream(path.join(outputDir, 'Leave_and_Deductions_Policy.pdf'));
doc.pipe(stream);

// Header
doc.fontSize(24).font('Helvetica-Bold').text('Company Leave & Deductions Policy', { align: 'center' });
doc.moveDown();
doc.fontSize(10).font('Helvetica').text('Effective Date: January 1, 2026', { align: 'center' });
doc.text('Version: 1.0', { align: 'center' });
doc.moveDown(2);

// Introduction
doc.fontSize(16).font('Helvetica-Bold').text('1. Introduction');
doc.fontSize(12).font('Helvetica').moveDown(0.5);
doc.text(
  'This document outlines the official company policy regarding Paid Time Off (PTO), Sick Leave, Unpaid Leave, and the corresponding salary deductions for unauthorized or unapproved absences. All employees are required to read, understand, and formally acknowledge this policy.'
);
doc.moveDown(1.5);

// Leave Allowances
doc.fontSize(16).font('Helvetica-Bold').text('2. Leave Allowances');
doc.fontSize(12).font('Helvetica').moveDown(0.5);
doc.text('Full-time employees are entitled to the following annual leave balances, credited evenly throughout the year:');
doc.moveDown(0.5);
doc.list([
  'Paid Time Off (PTO): 20 days per calendar year.',
  'Sick Leave: 10 days per calendar year.',
  'Bereavement Leave: Up to 5 days per occurrence.'
], { bulletRadius: 2 });
doc.moveDown(1);
doc.text('Part-time and contract employees will receive pro-rated leave balances based on their scheduled working hours.');
doc.moveDown(1.5);

// Request and Approval Process
doc.fontSize(16).font('Helvetica-Bold').text('3. Requesting and Approving Leave');
doc.fontSize(12).font('Helvetica').moveDown(0.5);
doc.text(
  'All leave requests must be submitted through the PeoplePay360 portal at least 14 days in advance for PTO. Sick leave must be logged as soon as practically possible, but no later than 9:00 AM on the day of the absence. Leave is only considered "Approved" once the direct manager has explicitly approved it in the system.'
);
doc.moveDown(1.5);

// Deductions and Unpaid Leave
doc.fontSize(16).font('Helvetica-Bold').text('4. Salary Deductions & Unpaid Leave');
doc.fontSize(12).font('Helvetica').moveDown(0.5);
doc.text(
  'If an employee takes leave without sufficient PTO/Sick balance, or if a leave request is explicitly denied but the employee takes the time off anyway, it will be classified as Unauthorized Unpaid Leave.'
);
doc.moveDown(0.5);
doc.text('The payroll deduction for unpaid leave is calculated as follows:');
doc.moveDown(0.5);
doc.font('Helvetica-Oblique').text('Deduction = (Monthly Gross Salary / Average Working Days) × Number of Unauthorized Days');
doc.font('Helvetica').moveDown(1);
doc.text(
  'Example: If the monthly gross salary is ₹100,000 and the average working days in the month is 22, the deduction for 1 day of unauthorized leave will be ₹4,545. This amount will be automatically deducted from the final net pay during the payroll run for that period.'
);
doc.moveDown(1.5);

// Acknowledgment
doc.fontSize(16).font('Helvetica-Bold').text('5. Employee Acknowledgment');
doc.fontSize(12).font('Helvetica').moveDown(0.5);
doc.text(
  'By digitally acknowledging this document in the PeoplePay360 portal, you confirm that you have read and understood the rules regarding leave allowances, approval workflows, and payroll deductions. Failure to comply with this policy may result in disciplinary action up to and including termination of employment.'
);

doc.end();

console.log('PDF Policy successfully generated at:', path.join(outputDir, 'Leave_and_Deductions_Policy.pdf'));
