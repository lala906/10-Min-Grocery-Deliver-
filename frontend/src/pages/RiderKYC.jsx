import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { submitKYC } from '../services/api';
import { FiFileText, FiUpload, FiCheck, FiArrowLeft, FiTruck } from 'react-icons/fi';

const VEHICLE_TYPES = ['bicycle', 'motorcycle', 'scooter', 'car', 'electric_bike'];

const FileInput = ({ label, id, onChange, required = true }) => (
    <div>
        <label htmlFor={id} className="text-sm font-bold text-gray-700 mb-1.5 block">{label} {required && <span className="text-red-500">*</span>}</label>
        <label htmlFor={id}
            className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all group">
            <div className="w-8 h-8 bg-gray-100 group-hover:bg-green-100 rounded-lg flex items-center justify-center transition-colors">
                <FiUpload className="text-gray-400 group-hover:text-green-500 w-4 h-4 transition-colors" />
            </div>
            <span className="text-sm text-gray-500 group-hover:text-green-600 font-medium transition-colors">Click to upload</span>
            <input id={id} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onChange(e.target.files[0])} required={required} />
        </label>
    </div>
);

const RiderKYC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [form, setForm] = useState({
        licenseNumber: '',
        licenseUrl: '',
        idProofType: 'aadhaar',
        idProofNumber: '',
        idProofUrl: '',
        vehicleRegUrl: '',
        selfieUrl: '',
    });
    const [files, setFiles] = useState({
        license: null, idProof: null, vehicleReg: null, selfie: null
    });

    const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

    const handleFileChange = (key, file) => {
        setFiles(f => ({ ...f, [key]: file }));
        // In real app: upload to S3/Cloudinary and get URL
        // For now, use placeholder URL with filename
        const fakeUrl = `https://storage.example.com/kyc/${Date.now()}_${file?.name}`;
        const urlKey = key === 'license' ? 'licenseUrl' : key === 'idProof' ? 'idProofUrl' : key === 'vehicleReg' ? 'vehicleRegUrl' : 'selfieUrl';
        setForm(f => ({ ...f, [urlKey]: fakeUrl }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.licenseNumber || !form.idProofNumber) {
            return showToast('Please fill in all required fields', 'error');
        }
        setLoading(true);
        try {
            await submitKYC(form);
            setStep(3);
            showToast('KYC submitted! Your documents are under review.');
        } catch (err) {
            showToast(err.response?.data?.message || 'Submission failed. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                    <FiArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="font-black text-gray-900">KYC Verification</h1>
                    <p className="text-xs text-gray-400">Complete verification to start earning</p>
                </div>
            </div>

            {/* Progress */}
            {step < 3 && (
                <div className="px-4 pt-4">
                    <div className="flex items-center gap-2">
                        {[1, 2].map(s => (
                            <React.Fragment key={s}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all ${step >= s ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    {step > s ? <FiCheck /> : s}
                                </div>
                                {s < 2 && <div className={`flex-1 h-1 rounded-full transition-all ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="flex justify-between mt-1.5">
                        <p className="text-xs text-gray-500 font-medium">Personal Details</p>
                        <p className="text-xs text-gray-500 font-medium">Documents</p>
                    </div>
                </div>
            )}

            <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
                {/* Step 1: Personal Details */}
                {step === 1 && (
                    <div className="space-y-5">
                        <div className="bg-white rounded-2xl border border-gray-100 p-5">
                            <h2 className="font-black text-gray-900 mb-4">Personal Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1.5 block">Driving Licence Number <span className="text-red-500">*</span></label>
                                    <input
                                        value={form.licenseNumber}
                                        onChange={e => setForm({ ...form, licenseNumber: e.target.value })}
                                        placeholder="e.g. DL-XXXXXXXXXXXXXXX"
                                        className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1.5 block">ID Proof Type <span className="text-red-500">*</span></label>
                                    <select
                                        value={form.idProofType}
                                        onChange={e => setForm({ ...form, idProofType: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                    >
                                        <option value="aadhaar">Aadhaar Card</option>
                                        <option value="pan">PAN Card</option>
                                        <option value="voter_id">Voter ID</option>
                                        <option value="passport">Passport</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-1.5 block">ID Number <span className="text-red-500">*</span></label>
                                    <input
                                        value={form.idProofNumber}
                                        onChange={e => setForm({ ...form, idProofNumber: e.target.value })}
                                        placeholder="Enter your ID number"
                                        className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                            <p className="font-bold mb-1">🔐 Why do we need this?</p>
                            <p>KYC is mandatory for regulatory compliance and to ensure the safety of our customers. All data is encrypted and secure.</p>
                        </div>

                        <button
                            onClick={() => {
                                if (!form.licenseNumber || !form.idProofNumber) return showToast('Please fill in all fields', 'error');
                                setStep(2);
                            }}
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl text-lg shadow-lg shadow-green-200 transition-all active:scale-95"
                        >
                            Continue →
                        </button>
                    </div>
                )}

                {/* Step 2: Document Upload */}
                {step === 2 && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="bg-white rounded-2xl border border-gray-100 p-5">
                            <h2 className="font-black text-gray-900 mb-4">Upload Documents</h2>
                            <div className="space-y-4">
                                <FileInput label="Driving Licence (Front)" id="license" onChange={f => handleFileChange('license', f)} />
                                <FileInput label={`${form.idProofType?.toUpperCase()} Card`} id="idProof" onChange={f => handleFileChange('idProof', f)} />
                                <FileInput label="Vehicle Registration Certificate" id="vehicleReg" onChange={f => handleFileChange('vehicleReg', f)} required={false} />
                                <FileInput label="Selfie with ID" id="selfie" onChange={f => handleFileChange('selfie', f)} />
                            </div>

                            {/* File preview list */}
                            {Object.entries(files).filter(([, f]) => f).map(([key, file]) => (
                                <div key={key} className="flex items-center gap-3 mt-3 p-3 bg-green-50 rounded-xl">
                                    <FiCheck className="text-green-600 w-4 h-4 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-green-700 capitalize">{key}</p>
                                        <p className="text-xs text-green-600 truncate">{file.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                            <p className="font-bold mb-1">📋 Accepted formats</p>
                            <p>JPG, PNG, or PDF. Max 5MB per document. Ensure documents are clearly visible and not expired.</p>
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setStep(1)}
                                className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all">
                                ← Back
                            </button>
                            <button type="submit" disabled={loading}
                                className="flex-1 py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-60">
                                {loading ? 'Submitting...' : 'Submit KYC'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 3: Success */}
                {step === 3 && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FiCheck className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-3">KYC Submitted!</h2>
                        <p className="text-gray-500 mb-2">Your documents are under review.</p>
                        <p className="text-sm text-gray-400 mb-8">We'll notify you once verification is complete. This usually takes 1–2 business days.</p>

                        <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-3 mb-8">
                            <div className="flex items-center gap-3">
                                <FiCheck className="text-green-500 w-4 h-4" />
                                <p className="text-sm font-medium text-gray-700">Documents received</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <FiFileText className="text-yellow-500 w-4 h-4" />
                                <p className="text-sm font-medium text-gray-700">Under admin review</p>
                            </div>
                            <div className="flex items-center gap-3 opacity-40">
                                <FiTruck className="text-gray-400 w-4 h-4" />
                                <p className="text-sm font-medium text-gray-500">Account activated — pending</p>
                            </div>
                        </div>

                        <Link to="/rider/dashboard"
                            className="block bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl text-lg shadow-lg shadow-green-200 transition-all active:scale-95">
                            Back to Dashboard
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
};

export default RiderKYC;
