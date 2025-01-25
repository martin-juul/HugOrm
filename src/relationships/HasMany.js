class HasMany {
  constructor(parent, relatedModel, foreignKey) {
    this.parent = parent;
    this.relatedModel = relatedModel;
    this.foreignKey = foreignKey;
  }

  async get() {
    return this.relatedModel.where({ [this.foreignKey]: this.parent.id });
  }
}

export default HasMany;