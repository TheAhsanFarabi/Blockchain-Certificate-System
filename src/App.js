import { useState, useEffect } from "react";
import { BrowserProvider, Contract } from "ethers";
import toast, { Toaster } from "react-hot-toast"; // Install with `npm install react-hot-toast`

const CONTRACT_ADDRESS = "0xE8DE19974B819D5AF168dF5Cd5f095f0eA8E4D22";
const CONTRACT_ABI = [
    {
        "inputs": [
            { "internalType": "string", "name": "_studentName", "type": "string" },
            { "internalType": "string", "name": "_course", "type": "string" },
            { "internalType": "string", "name": "_institution", "type": "string" }
        ],
        "name": "issueCertificate",
        "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "bytes32", "name": "certHash", "type": "bytes32" }],
        "name": "revokeCertificate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "bytes32", "name": "certHash", "type": "bytes32" }],
        "name": "verifyCertificate",
        "outputs": [
            { "internalType": "string", "name": "", "type": "string" },
            { "internalType": "string", "name": "", "type": "string" },
            { "internalType": "string", "name": "", "type": "string" },
            { "internalType": "uint256", "name": "", "type": "uint256" },
            { "internalType": "bool", "name": "", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "admin",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    }
];

function App() {
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [certificateHash, setCertificateHash] = useState("");
    const [certificateData, setCertificateData] = useState(null);
    const [admin, setAdmin] = useState(null);

    // Form inputs
    const [studentName, setStudentName] = useState("");
    const [course, setCourse] = useState("");
    const [institution, setInstitution] = useState("");
    const [revokeCertHash, setRevokeCertHash] = useState("");

    useEffect(() => {
        const loadBlockchainData = async () => {
            if (window.ethereum) {
                const provider = new BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const contractInstance = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
                setContract(contractInstance);

                const accounts = await provider.send("eth_requestAccounts", []);
                setAccount(accounts[0]);

                // Fetch admin address from contract
                const adminAddress = await contractInstance.admin();
                setAdmin(adminAddress.toLowerCase());
            } else {
                toast.error("Please install MetaMask!");
            }
        };
        loadBlockchainData();
    }, []);

    const verifyCertificate = async () => {
        if (!certificateHash || !contract) return;

        try {
            const certDetails = await contract.verifyCertificate(certificateHash);

            if (!certDetails || certDetails[0] === "") {
                throw new Error("Certificate not found.");
            }

            setCertificateData({
                studentName: certDetails[0],
                course: certDetails[1],
                institution: certDetails[2],
                issueDate: new Date(Number(certDetails[3]) * 1000).toLocaleDateString(),
                isValid: certDetails[4],
            });
        } catch (error) {
            console.error("Verification failed:", error);
            toast.error("Certificate verification failed or certificate does not exist.");
        }
    };

    const issueCertificate = async () => {
        if (!contract || !studentName || !course || !institution) {
            toast.error("All fields are required!");
            return;
        }

        try {
            const tx = await contract.issueCertificate(studentName, course, institution);
            const receipt = await tx.wait(); // Wait for confirmation

            // Extract `certHash` from event logs
            const event = receipt.logs.find(log => log.topics.length > 0);
            if (!event) throw new Error("Certificate hash event not found!");

            const certHash = event.data; // This might need decoding
            let trimmedCertHash = certHash.substring(0, 66);
            setCertificateHash(trimmedCertHash);
            toast.success("Certificate Issued Successfully!");
        } catch (error) {
            console.error("Certificate issuance failed:", error);
            toast.error("Failed to issue certificate.");
        }
    };

    const revokeCertificate = async () => {
        if (!contract || !revokeCertHash) {
            toast.error("Please enter a valid certificate hash to revoke.");
            return;
        }

        try {
            const tx = await contract.revokeCertificate(revokeCertHash);
            await tx.wait();
            toast.success("Certificate Revoked Successfully!");
        } catch (error) {
            console.error("Revocation failed:", error);
            toast.error("Failed to revoke certificate.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
            <Toaster position="top-right" />

            <h1 className="text-3xl font-bold mb-4">Blockchain Certificate System</h1>
            <p className="text-lg">Connected Account: {account || "Not Connected"}</p>
            <p className="text-lg">Admin Address: {admin || "Fetching..."}</p>

            {/* Verify Certificate */}
            <div className="mt-4">
                <h2 className="text-2xl font-bold">Verify Certificate</h2>
                <input
                    type="text"
                    className="p-2 border rounded-lg"
                    placeholder="Enter Certificate Hash"
                    value={certificateHash}
                    onChange={(e) => setCertificateHash(e.target.value)}
                />
                <button
                    onClick={verifyCertificate}
                    className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700"
                >
                    Verify
                </button>
            </div>

            {certificateData && (
                <div className="mt-6 bg-white p-4 rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold">Certificate Details</h2>
                    <p><strong>Student Name:</strong> {certificateData.studentName}</p>
                    <p><strong>Course:</strong> {certificateData.course}</p>
                    <p><strong>Institution:</strong> {certificateData.institution}</p>
                    <p><strong>Issue Date:</strong> {certificateData.issueDate}</p>
                    <p><strong>Status:</strong> {certificateData.isValid ? "Valid" : "Revoked"}</p>
                </div>
            )}

            {/* Admin Panel */}
            {account === admin && (
                <div className="mt-8 bg-white p-6 rounded-lg shadow-lg w-1/2">
                    <h2 className="text-2xl font-bold mb-4">Admin Panel</h2>

                    {/* Issue Certificate */}
                    <h3 className="text-xl font-bold">Issue Certificate</h3>
                    <input type="text" className="p-2 border rounded-lg w-full mt-2" placeholder="Student Name" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                    <input type="text" className="p-2 border rounded-lg w-full mt-2" placeholder="Course" value={course} onChange={(e) => setCourse(e.target.value)} />
                    <input type="text" className="p-2 border rounded-lg w-full mt-2" placeholder="Institution" value={institution} onChange={(e) => setInstitution(e.target.value)} />
                    <button onClick={issueCertificate} className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-700 w-full">Issue Certificate</button>

                    {/* Revoke Certificate */}
                    <h3 className="text-xl font-bold mt-4">Revoke Certificate</h3>
                    <input type="text" className="p-2 border rounded-lg w-full mt-2" placeholder="Enter Certificate Hash" value={revokeCertHash} onChange={(e) => setRevokeCertHash(e.target.value)} />
                    <button onClick={revokeCertificate} className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-700 w-full">Revoke Certificate</button>
                </div>
            )}
        </div>
    );
}

export default App;
