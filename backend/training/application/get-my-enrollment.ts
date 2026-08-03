import type { BlackoutWindow } from 'domain/training';
import type { TrainingEnrollmentRepository, BlackoutWindowRepository } from './ports.js';

interface GetMyEnrollmentRequest {
  userId: string;
}

interface GetMyEnrollmentResponse {
  trainingIds: string[];
  blackoutWindows: BlackoutWindow[];
}

export class GetMyEnrollment {
  constructor(
    private trainingEnrollmentRepository: TrainingEnrollmentRepository,
    private blackoutWindowRepository: BlackoutWindowRepository,
  ) {}

  async execute({ userId }: GetMyEnrollmentRequest): Promise<GetMyEnrollmentResponse> {
    const [trainingIds, blackoutWindows] = await Promise.all([
      this.trainingEnrollmentRepository.findTrainingIdsByUser(userId),
      this.blackoutWindowRepository.findByUserId(userId),
    ]);
    return { trainingIds, blackoutWindows };
  }
}
