const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { listPolicies } = require('../services/leavePolicyService');

const ACCRUAL_TYPES = ['yearly', 'monthly', 'none'];

// @route  GET /api/leave-policies
const getPolicies = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await listPolicies() });
});

// @route  POST /api/leave-policies  (admin)
const createPolicy = asyncHandler(async (req, res) => {
  const { leaveType, annualAllowance, accrual, carryForward, maxCarryForward, active } = req.body;
  if (!leaveType || !String(leaveType).trim()) {
    return res.status(400).json({ success: false, message: 'Leave type is required' });
  }
  const name = String(leaveType).trim();
  const existing = await prisma.leavePolicy.findUnique({ where: { leaveType: name } });
  if (existing) return res.status(409).json({ success: false, message: 'A policy for this leave type already exists' });

  const policy = await prisma.leavePolicy.create({
    data: {
      leaveType: name,
      annualAllowance: Math.max(0, parseInt(annualAllowance, 10) || 0),
      accrual: ACCRUAL_TYPES.includes(accrual) ? accrual : 'yearly',
      carryForward: !!carryForward,
      maxCarryForward: Math.max(0, parseInt(maxCarryForward, 10) || 0),
      active: active === undefined ? true : !!active,
    },
  });
  res.status(201).json({ success: true, message: 'Leave policy created', data: policy });
});

// @route  PUT /api/leave-policies/:id  (admin)
const updatePolicy = asyncHandler(async (req, res) => {
  const existing = await prisma.leavePolicy.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Leave policy not found' });

  const { leaveType, annualAllowance, accrual, carryForward, maxCarryForward, active } = req.body;
  const data = {};
  if (leaveType !== undefined) {
    const name = String(leaveType).trim();
    if (!name) return res.status(400).json({ success: false, message: 'Leave type is required' });
    const clash = await prisma.leavePolicy.findFirst({ where: { leaveType: name, NOT: { id: existing.id } } });
    if (clash) return res.status(409).json({ success: false, message: 'A policy for this leave type already exists' });
    data.leaveType = name;
  }
  if (annualAllowance !== undefined) data.annualAllowance = Math.max(0, parseInt(annualAllowance, 10) || 0);
  if (accrual !== undefined) data.accrual = ACCRUAL_TYPES.includes(accrual) ? accrual : existing.accrual;
  if (carryForward !== undefined) data.carryForward = !!carryForward;
  if (maxCarryForward !== undefined) data.maxCarryForward = Math.max(0, parseInt(maxCarryForward, 10) || 0);
  if (active !== undefined) data.active = !!active;

  const policy = await prisma.leavePolicy.update({ where: { id: existing.id }, data });
  res.json({ success: true, message: 'Leave policy updated', data: policy });
});

// @route  DELETE /api/leave-policies/:id  (admin)
const deletePolicy = asyncHandler(async (req, res) => {
  const existing = await prisma.leavePolicy.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Leave policy not found' });
  await prisma.leavePolicy.delete({ where: { id: existing.id } });
  res.json({ success: true, message: 'Leave policy deleted' });
});

module.exports = { getPolicies, createPolicy, updatePolicy, deletePolicy };
