import { Request, Response, NextFunction } from "express";
import { Patient } from "../models/Patient.js";
import { PrescribeMeds } from "../models/PrescribeMeds.js";
import { Pharmacy } from "../models/Pharmacy.js";
import { Diagnosis } from "../models/Diagnosis.js";
import { PrescribeTest } from "../models/PrescribeTest.js";
import { Referral } from "../models/Referral.js";
import { Doctor } from "../models/Doctor.js";
import { Department } from "../models/Department.js";
import { User } from "../models/User.js";

export const getAnalytics = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [
      totalPatients,
      totalDoctors,
      totalDiagnosisMaster,
      totalReferrals,
      diagnosedPatientsCount,
      patientsBenefitedMeds,
      totalVitalsRecorded,
      medsDistributedAgg,
      genderAgg,
      deptAgg,
      ratingsAgg,
      departmentsList,
    ] = await Promise.all([
      Patient.countDocuments(),
      Doctor.countDocuments(),
      Diagnosis.countDocuments(),
      Referral.countDocuments(),
      Patient.countDocuments({ hasTest: true }),
      Patient.countDocuments({ hasMeds: true }),
      Patient.countDocuments({ "vitals.bp": { $exists: true, $ne: "" } }),
      PrescribeMeds.aggregate([
        { $unwind: "$data" },
        { $group: { _id: null, total: { $sum: "$data.qty" } } },
      ]),
      Patient.aggregate([{ $group: { _id: "$gender", count: { $sum: 1 } } }]),
      Patient.aggregate([
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Patient.aggregate([
        { $match: { ratings: { $exists: true, $gt: 0 } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$ratings" },
            count: { $sum: 1 },
          },
        },
      ]),
      Department.find({}, "id name").lean(),
    ]);

    const totalMedsDistributed = medsDistributedAgg[0]?.total || 0;

    // Map department id and name
    const deptMap: Record<string, string> = {};
    for (const d of departmentsList) {
      deptMap[d.id] = d.name;
      deptMap[d.name] = d.name;
    }

    const departmentWisePatients = deptAgg.map((item) => ({
      departmentId: item._id,
      departmentName: deptMap[item._id] || item._id || "General Practice",
      count: item.count,
    }));

    const genderDistribution = genderAgg.map((item) => ({
      gender: item._id || "OTHER",
      count: item.count,
    }));

    // Top 5 Doctors by Patient Load
    const topDoctorsAgg = await Patient.aggregate([
      { $match: { doctorId: { $exists: true, $ne: null } } },
      { $group: { _id: "$doctorId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);
    const topDocIds = topDoctorsAgg.map((d) => d._id);
    const topDoctorDocs = await Doctor.find(
      { doctorId: { $in: topDocIds } },
      "doctorId firstName lastName department degree hospital",
    ).lean();
    const docLookup: Record<number, any> = {};
    topDoctorDocs.forEach((d) => {
      docLookup[d.doctorId] = d;
    });
    const topDoctors = topDoctorsAgg.map((d) => ({
      doctorId: d._id,
      name: docLookup[d._id]
        ? `Dr. ${docLookup[d._id].firstName} ${docLookup[d._id].lastName}`
        : `Dr. #${d._id}`,
      department: docLookup[d._id]?.department || "General",
      degree: docLookup[d._id]?.degree || "MBBS",
      hospital: docLookup[d._id]?.hospital || "Camp Onsite",
      patientCount: d.count,
    }));

    // Top 5 Volunteers by Patients Handled (excluding system self-enrollment user)
    const topVolunteersAgg = await Patient.aggregate([
      { $match: { author: { $exists: true, $nin: ["", "self_patient"] } } },
      { $group: { _id: "$author", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    const topVolAuthors = topVolunteersAgg.map((v) => v._id);
    const topVolDocs = await User.find(
      {
        $or: [
          { id: { $in: topVolAuthors } },
          { username: { $in: topVolAuthors } },
        ],
      },
      "id username name role",
    ).lean();
    const volLookup: Record<string, any> = {};
    topVolDocs.forEach((v) => {
      volLookup[v.id] = v;
      volLookup[v.username] = v;
    });
    const topVolunteers = topVolunteersAgg
      .filter(
        (v) =>
          volLookup[v._id]?.username !== "self_patient" &&
          volLookup[v._id]?.role !== "SYSTEM",
      )
      .slice(0, 5)
      .map((v) => ({
        id: v._id,
        name: volLookup[v._id]?.name || `Volunteer ${v._id}`,
        username: volLookup[v._id]?.username || v._id,
        patientCount: v.count,
      }));

    // Ratings distribution
    const ratingBreakdownAgg = await Patient.aggregate([
      { $match: { ratings: { $exists: true, $gt: 0 } } },
      { $group: { _id: "$ratings", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const ratingBreakdown = Array.from({ length: 10 }, (_, i) => {
      const score = i + 1;
      const found = ratingBreakdownAgg.find((r) => r._id === score);
      return { rating: score, count: found ? found.count : 0 };
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalPatients,
          totalMedsDistributed,
          totalDiagnosis: totalDiagnosisMaster,
          diagnosedPatientsCount,
          patientsBenefitedMeds,
          totalReferrals,
          totalDoctors,
          totalVitalsRecorded,
          avgRating: ratingsAgg[0]?.avgRating
            ? Number(ratingsAgg[0].avgRating.toFixed(1))
            : 0,
          totalRatingsGiven: ratingsAgg[0]?.count || 0,
        },
        departmentWisePatients,
        genderDistribution,
        ratingBreakdown,
        flowFunnel: [
          { stage: "Registered", count: totalPatients },
          { stage: "Vitals Done", count: totalVitalsRecorded },
          { stage: "Meds Given", count: patientsBenefitedMeds },
          { stage: "Tests Ordered", count: diagnosedPatientsCount },
          { stage: "Referrals", count: totalReferrals },
        ],
        topPerformers: {
          doctors: topDoctors,
          volunteers: topVolunteers,
          topDoctors,
          topVolunteers,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
