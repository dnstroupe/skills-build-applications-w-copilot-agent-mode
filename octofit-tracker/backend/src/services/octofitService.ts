import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isObjectIdArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(
    (member) => typeof member === 'string' && mongoose.isObjectIdOrHexString(member),
  );
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) throw httpError('Activity details are required', 400);
  const { userId, teamId, type, minutes } = input;
  if (
    typeof userId !== 'string' ||
    typeof teamId !== 'string' ||
    typeof type !== 'string' ||
    !type.trim() ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    throw httpError('A valid userId, teamId, type, and positive minutes are required', 400);
  }
  if (!mongoose.isObjectIdOrHexString(userId) || !mongoose.isObjectIdOrHexString(teamId)) {
    throw httpError('userId and teamId must be valid IDs', 400);
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) throw httpError('The referenced user or team does not exist', 404);

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) throw httpError('Team details are required', 400);
  const { name, mascot, members } = input;
  if (typeof name !== 'string' || !name.trim() || typeof mascot !== 'string' || !mascot.trim()) {
    throw httpError('A team name and mascot are required', 400);
  }
  if (members !== undefined && !isObjectIdArray(members)) {
    throw httpError('members must be an array of valid user IDs', 400);
  }

  const memberIds = members ?? [];
  const memberUsers = memberIds.length > 0
    ? await User.find({ _id: { $in: memberIds } }).select('_id')
    : [];
  const uniqueMemberCount = new Set(memberIds.map((id) => id.toLowerCase())).size;
  if (memberUsers.length !== uniqueMemberCount) {
    throw httpError('One or more team members do not exist', 404);
  }

  return Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: memberUsers.map((member) => member._id),
  });
}

export async function getLeaderboard() {
  const [teams, activityTotals] = await Promise.all([
    Team.find().select('_id name').lean(),
    Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(activityTotals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  return teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: pointsByTeam.get(team._id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(_userEmail: string) {
  const user = await User.findOne({ email: _userEmail.trim().toLowerCase() }).lean();
  if (!user) throw httpError('No user was found for that email address', 404);

  const [recentActivity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find().lean(),
  ]);
  const recentFocus = recentActivity
    ? focusForActivity(recentActivity.type)
    : undefined;
  const goalFocus = user.fitnessGoal.trim().toLowerCase();
  const preferredFocus = workouts.some((workout) => workout.focus.toLowerCase() === goalFocus)
    ? goalFocus
    : recentFocus;

  return workouts
    .sort((left, right) => Number(right.focus.toLowerCase() === preferredFocus) - Number(left.focus.toLowerCase() === preferredFocus))
    .map((workout) => ({
      ...workout,
      reason: workout.focus.toLowerCase() === goalFocus
        ? `Supports your ${user.fitnessGoal} fitness goal.`
        : recentActivity && workout.focus.toLowerCase() === recentFocus
          ? `Builds on your recent ${recentActivity.type} activity.`
          : 'A general option to complement your fitness routine.',
    }));
}

function focusForActivity(type: string) {
  const activityType = type.trim().toLowerCase();
  if (activityType === 'run' || activityType === 'cycle' || activityType === 'walk') return 'endurance';
  if (activityType === 'strength') return 'strength';
  if (activityType === 'yoga' || activityType === 'stretch' || activityType === 'mobility') return 'mobility';
  return activityType;
}

export { User };
