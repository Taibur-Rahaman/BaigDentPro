import React from 'react';

const RecordsPage: React.FC = () => {
	// Dummy data for demonstration
	const patients = [
		{ id: '1', name: 'John Doe' },
		{ id: '2', name: 'Jane Smith' },
	];
	const appointments = [
		{ id: '201', date: '2026-03-19', time: '10:00', patient: 'John Doe', type: 'Checkup', status: 'Scheduled' },
		{ id: '202', date: '2026-03-19', time: '11:30', patient: 'Jane Smith', type: 'Consultation', status: 'Confirmed' },
	];

	return (
		<div className="appointments-page">
			<header className="appointments-header">
				<div className="header-content">
					<h1 className="header-title">Appointments</h1>
					<p className="header-subtitle">Manage, schedule, and track all your patient appointments in one place.</p>
				</div>
			</header>
			<main className="appointments-main">
				<section className="appointment-form-section">
					<div className="appointment-form-card">
						<h2 className="section-title">Schedule New Appointment</h2>
						<form className="appointment-form">
							<div className="form-group">
								<label htmlFor="patient" className="form-label">Patient <span className="required">*</span></label>
								<select id="patient" className="form-input" required>
									<option value="">-- Select Patient --</option>
									{patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
								</select>
							</div>
							<div className="form-group">
								<label htmlFor="date" className="form-label">Date <span className="required">*</span></label>
								<input id="date" type="date" className="form-input" required />
							</div>
							<div className="form-group">
								<label htmlFor="time" className="form-label">Time <span className="required">*</span></label>
								<input id="time" type="time" className="form-input" required />
							</div>
							<div className="form-group">
								<label htmlFor="type" className="form-label">Type</label>
								<select id="type" className="form-input">
									<option value="Checkup">Checkup</option>
									<option value="Consultation">Consultation</option>
									<option value="Procedure">Procedure</option>
									<option value="Follow-up">Follow-up</option>
								</select>
							</div>
							<div className="form-actions">
								<button type="submit" className="btn-primary">+ Add Appointment</button>
							</div>
						</form>
					</div>
				</section>
				<section className="appointments-list-section">
					<div className="appointments-list-card">
						<h2 className="section-title">Upcoming Appointments</h2>
						<table className="appointments-table">
							<thead>
								<tr>
									<th>Date</th>
									<th>Time</th>
									<th>Patient</th>
									<th>Type</th>
									<th>Status</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{appointments.map(apt => (
									<tr key={apt.id}>
										<td>{apt.date}</td>
										<td>{apt.time}</td>
										<td>{apt.patient}</td>
										<td>{apt.type}</td>
										<td>
											<span className={apt.status === 'Scheduled' ? 'badge badge-pending' : 'badge badge-confirmed'}>
												{apt.status}
											</span>
										</td>
										<td>
											<button className="btn-secondary">Edit</button>
											<button className="btn-secondary" style={{ marginLeft: 8 }}>Cancel</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			</main>
		</div>
	);
};

export default RecordsPage;
