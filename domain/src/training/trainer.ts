interface TrainerProps {
  id: string;
  name: string;
}

export class Trainer {
  id: string;
  name: string;

  constructor({ id, name }: TrainerProps) {
    this.id = id;
    this.name = name;
  }

  // The only creation path.
  static create({ id, name }: TrainerProps): Trainer {
    if (!id) throw new Error('Trainer requires an id');
    if (!name || !name.trim()) throw new Error('Trainer requires a non-empty name');
    return new Trainer({ id, name });
  }
}
