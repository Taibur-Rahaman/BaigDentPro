import type { MedHistoryVM } from '@/hooks/view/apiReturnTypes';
import type { PatientRecordFormData, YesNo } from '@/hooks/view/practiceWorkspaceShared';

export function buildPatientRecordFormPrintHtml(
  patientNameForTitle: string,
  medicalHistory: MedHistoryVM,
  patientRecordForm: PatientRecordFormData,
): string {
  const esc = (s: unknown) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const yesNo = (v: YesNo) => (v === 'Yes' ? 'Yes' : v === 'No' ? 'No' : '—');
  const tick = (b: boolean) => (b ? '☑' : '☐');
  const mh = medicalHistory || {};

  const checklist = patientRecordForm.treatmentChecklist;

  const diseases: Array<[string, boolean]> = [
    ['Blood Pressure (High/Low)', Boolean(mh.bloodPressure)],
    ['Heart Problems (e.g. Rheumatic Fever)', Boolean(mh.heartProblems) || Boolean(mh.rheumaticFever)],
    ['Diabetes', Boolean(mh.diabetes)],
    ['Peptic Ulcer / Acidity', Boolean(mh.pepticUlcer)],
    ['Jaundice/Liver Diseases', Boolean(mh.jaundice) || Boolean(mh.hepatitis)],
    ['Asthma', Boolean(mh.asthma)],
    ['Tuberculosis', Boolean(mh.tuberculosis)],
    ['Kidney Diseases', Boolean(mh.kidneyDiseases)],
    ['AIDS', Boolean(mh.aids)],
    ['Thyroid', Boolean(mh.thyroid)],
    ['Other Problems (Please Specify)', Boolean(mh.otherDiseases)],
  ];

  const allergies: Array<[string, boolean]> = [
    ['Penicillin', Boolean(mh.allergyPenicillin)],
    ['Sulphur', Boolean(mh.allergySulphur)],
    ['Aspirin', Boolean(mh.allergyAspirin)],
    ['Local Anaesthesia', Boolean(mh.allergyLocalAnaesthesia)],
    ['Others (Please Specify)', Boolean(mh.allergyOther)],
  ];

  const habits: Array<[string, boolean]> = [
    ['Smoking', Boolean(mh.habitSmoking)],
    ['Chewing Betel Leaf/Nut', Boolean(mh.habitBetelLeaf)],
    ['Alcohol', Boolean(mh.habitAlcohol)],
    ['Others (Please Specify)', Boolean(mh.habitOther)],
  ];

  const planLines: Array<[string, boolean]> = [
    ['Examination', checklist.Examination],
    ['X-Ray/RVG', checklist.XRayRVG],
    ['Consultation', checklist.Consultation],
    ['Calculus', checklist.Calculus],
    ['Scaling', checklist.Scaling],
    ['Caries', checklist.Caries],
    ['Filling', checklist.Filling],
    ['Deep Caries', checklist.DeepCaries],
    ['Root Canal', checklist.RootCanal],
    ['BDR/BDC/Fracture', checklist.BDR_BDC_Fracture],
    ['Missing', checklist.Missing],
    ['Extraction/Surgical Ext', checklist.Extraction_SurgicalExt],
    ['Partial/Complete Denture/Implant', checklist.Denture_Implant],
    ['Mobility', checklist.Mobility],
    ['Mucosal Lesion', checklist.MucosalLesion],
    ['Implant', checklist.Implant],
    ['Fixed Orthodontics', checklist.FixedOrthodontics],
  ];

  const takingDrugLines: Array<[string, boolean]> = [
    ['Aspirin/Blood Thinner', checklist.TakingDrug_AspirinBloodThinner],
    ['Antihypertensive', checklist.TakingDrug_Antihypertensive],
    ['Inhaler', checklist.TakingDrug_Inhaler],
    ['Others', checklist.TakingDrug_Others],
  ];

  const twoCol = (pairs: Array<[string, boolean]>) => {
    const left: string[] = [];
    const right: string[] = [];
    pairs.forEach((p, idx) => (idx % 2 === 0 ? left : right).push(`<div class="check">${tick(p[1])} ${esc(p[0])}</div>`));
    return `<div class="two-col"><div>${left.join('')}</div><div>${right.join('')}</div></div>`;
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Edit Patient Profile - ${esc(patientNameForTitle)}</title>
  <style>
    *{box-sizing:border-box;}
    body{font-family: Arial, sans-serif; color:#000; margin:0; background:#fff;}
    .page{max-width: 900px; margin: 0 auto; padding: 18px;}
    h1{font-size:18px; margin:0 0 10px; text-align:center; letter-spacing:0.3px;}
    h2{font-size:14px; margin:16px 0 8px; border-bottom:1px solid #000; padding-bottom:4px;}
    .grid{display:grid; grid-template-columns: 1fr 1fr; gap:10px 14px;}
    .field{border:1px solid #000; padding:8px; min-height:40px;}
    .label{font-size:11px; font-weight:bold; margin-bottom:4px;}
    .val{font-size:13px; white-space:pre-wrap;}
    .two-col{display:grid; grid-template-columns: 1fr 1fr; gap:8px 24px;}
    .check{font-size:13px; padding:2px 0;}
    .small{font-size:12px;}
    .box{border:1px solid #000; padding:10px;}
    .sign-grid{display:grid; grid-template-columns: 1fr 1fr; gap:10px 14px;}
    .line{border-bottom:1px solid #000; min-height:18px;}
    @media print{
      .page{padding:0.6cm;}
    }
  </style>
</head>
<body>
  <div class="page">
    <h1>PATIENT RECORD FORM</h1>

    <div class="grid">
      <div class="field"><div class="label">Reg. No.</div><div class="val">${esc(patientRecordForm.regNo)}</div></div>
      <div class="field"><div class="label">Name</div><div class="val">${esc(patientRecordForm.name)}</div></div>
      <div class="field"><div class="label">Occupation</div><div class="val">${esc(patientRecordForm.occupation)}</div></div>
      <div class="field"><div class="label">Mob.</div><div class="val">${esc(patientRecordForm.mobile)}</div></div>
      <div class="field"><div class="label">Address</div><div class="val">${esc(patientRecordForm.address)}</div></div>
      <div class="field"><div class="label">Ref.: ....</div><div class="val">${esc(patientRecordForm.refBy)}</div></div>
      <div class="field"><div class="label">Age</div><div class="val">${esc(patientRecordForm.age)}</div></div>
      <div class="field"><div class="label">Blood Pressure (High/Low)</div><div class="val">${esc(patientRecordForm.bloodPressureReading)}</div></div>
    </div>

    <h2>MEDICAL HISTORY</h2>
    <div class="box">
      <div class="small"><b>Diseases Like</b></div>
      ${twoCol(diseases)}

      <div style="margin-top:10px" class="small"><b>Other Problems (Please Specify)</b></div>
      <div class="val">${esc(mh.otherDiseases || '')}</div>

      <div style="margin-top:10px" class="small"><b>If Female, Are you pregnant?</b> ${esc(yesNo(patientRecordForm.femalePregnant))}</div>

      <div style="margin-top:10px" class="small"><b>Allergic to</b></div>
      ${twoCol(allergies)}
      <div class="val">${esc(mh.allergyOther || '')}</div>

      <div style="margin-top:10px" class="small"><b>Bad Habit Like</b></div>
      ${twoCol(habits)}
      <div class="val">${esc(mh.habitOther || '')}</div>
    </div>

    <h2>DIAGNOSIS</h2>
    <div class="box"><div class="val">${esc(patientRecordForm.diagnosisText)}</div></div>

    <h2>TREATMENT PLAN</h2>
    <div class="box">
      ${twoCol(planLines)}
      <div style="margin-top:10px" class="small"><b>Taking Drug</b></div>
      ${twoCol(takingDrugLines)}
      <div class="val">${esc(patientRecordForm.takingDrugOtherText)}</div>

      <div style="margin-top:10px" class="small"><b>Examination</b></div>
      <div class="val">${esc(patientRecordForm.examinationNotes)}</div>
    </div>

    <h2>COST</h2>
    <div class="box">
      <div class="grid">
        <div class="field"><div class="label">Total=</div><div class="val">${esc(patientRecordForm.costTotal)}</div></div>
        <div class="field"><div class="label">of myself/my.</div><div class="val">${esc(patientRecordForm.costPayerText)}</div></div>
      </div>
    </div>

    <h2>CONSENT</h2>
    <div class="box">
      <div class="check">${tick(patientRecordForm.agreeToTreatment)} I do hereby agree to undergo necessary treatment</div>
      <div class="check">${tick(patientRecordForm.explainedComplications)} The procedure & the potential complications (if any) were explained to me.</div>
      <div style="margin-top:10px" class="sign-grid">
        <div>
          <div class="small"><b>Date:</b> ${esc(patientRecordForm.consentDate)}</div>
          <div class="line"></div>
        </div>
        <div>
          <div class="small"><b>Signature/Name:</b> ${esc(patientRecordForm.signatureName)}</div>
          <div class="line"></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
