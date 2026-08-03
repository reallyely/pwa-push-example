interface TrainingProps {
  id: string;
  title: string;
  description?: string;
  dateTime: Date;
  trainerId: string;
}

export class Training {
  id: string;
  title: string;
  description?: string;
  dateTime: Date;
  trainerId: string;

  constructor({ id, title, description, dateTime, trainerId }: TrainingProps) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.dateTime = dateTime;
    this.trainerId = trainerId;
  }

  // The only creation path.
  static schedule({ id, title, description, dateTime, trainerId }: TrainingProps): Training {
    if (!id) throw new Error('Training requires an id');
    if (!title) throw new Error('Training requires a title');
    if (!(dateTime instanceof Date) || isNaN(dateTime.getTime())) {
      throw new Error('Training requires a valid dateTime');
    }
    if (!trainerId) throw new Error('Training requires a trainerId');
    return new Training({ id, title, description, dateTime, trainerId });
  }
}
