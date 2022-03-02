import * as moment from 'moment';
import mongoose from 'mongoose';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { TimeSlotRepository } from '../repositories/time-slot.repository';
import { DefineAttendancePresenceDTO } from '../dto/attendance-is-present.dto';
import { Attendance } from '../models/attendance.model';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { SignAttendanceDTO } from 'src/dto/sign-attendance.dto';
import { FileRepository } from 'src/repositories/file.repository';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly timeSlotRepository: TimeSlotRepository,
    private readonly attendanceRepository: AttendanceRepository,
    private readonly fileRepository: FileRepository,
  ) {}

  initTimeSlotAttendances = async (timeSlotId: string): Promise<void> => {
    const timeSlot = await this.timeSlotRepository.getTimeSlotWithGroupUsers(
      timeSlotId,
    );

    const initTimeSlotAttendances = await this.attendanceRepository.findManyBy({
      timeSlot: timeSlot._id,
    });

    if (initTimeSlotAttendances.length > 0) {
      throw new ForbiddenException('Time slot attendances already initiated');
    }

    const startDate = moment(timeSlot.startDate);
    const now = moment();

    if (startDate.isBefore(now.subtract(10, 'minutes'))) {
      throw new BadRequestException({
        statusCode: 400,
        message: "It's too early to start attendance signing",
      });
    }

    const initAttendancesPromises = timeSlot.group.users.map((user) => {
      this.attendanceRepository.insert({
        timeSlot: timeSlot._id,
        user: user._id,
      });
    });

    await Promise.all(initAttendancesPromises);
  };

  getAllTimeSlotAttendances = async (
    timeSlotId: string,
  ): Promise<Attendance[]> =>
    this.attendanceRepository.findManyBy(
      {
        timeSlot: new mongoose.Types.ObjectId(timeSlotId),
      },
      { populate: ['user', 'signFile'] },
    );

  getAttendancesById = async (attendanceId: string): Promise<Attendance> =>
    this.attendanceRepository.findOneById(attendanceId, {
      populate: ['signFile'],
    });

  defineAttendancePresence = async (
    attendanceId: string,
    set: DefineAttendancePresenceDTO,
  ): Promise<void> => {
    const attendance = await this.attendanceRepository.findOneById(
      attendanceId,
    );

    if (!attendance) {
      throw new NotFoundException('Attendance not found');
    }

    if (set.isPresent === false) {
      attendance.signFile = undefined;
      attendance.signDate = undefined;
    }

    attendance.isPresent = set.isPresent;

    await attendance.save();
  };

  signAttendance = async (
    attendanceId: string,
    userId: string,
    set: SignAttendanceDTO,
  ): Promise<void> => {
    const attendance = await this.attendanceRepository.findOneById(
      attendanceId,
    );

    if (!attendance) {
      throw new NotFoundException('Attendance not found');
    }

    // TODO: add sign key validation (getted with QRCode) or isPresent === true to be able to sign

    if (attendance.signDate) {
      throw new ForbiddenException('You cannot sign twice');
    }

    if (attendance.isPresent === false) {
      throw new ForbiddenException('You cannot sign when you are absent');
    }

    const signFile = await this.fileRepository.findOneById(set.signFileId);

    if (!signFile) {
      throw new NotFoundException('Sign file not found');
    }

    const attendesSignWithSameSignFile =
      await this.attendanceRepository.isSignFileAreadyUseForSignAnAttendance(
        userId,
        signFile._id,
      );

    if (attendesSignWithSameSignFile) {
      throw new ForbiddenException(
        'You cannot sign with same signature twice. Please create new one.',
      );
    }

    attendance.signFile = signFile._id;
    attendance.isPresent = true;
    attendance.signDate = new Date();

    await attendance.save();
  };

  getUserAttendances = async (userId: string): Promise<Attendance[]> =>
    this.attendanceRepository.findManyBy({
      user: userId,
    });
}