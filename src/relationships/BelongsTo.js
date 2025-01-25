class BelongsTo {
  constructor(parent, relatedModel, foreignKey) {
    this.parent = parent;
    this.relatedModel = relatedModel;
    this.foreignKey = foreignKey;
  }

  async get() {
    return this.relatedModel.find(this.parent[this.foreignKey]);
  }
}

export default BelongsTo;