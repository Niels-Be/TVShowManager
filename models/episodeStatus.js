module.exports = function(sequelize, DataTypes) {
    var EpisodeStatus = sequelize.define("EpisodeStatus", {
        provider: {type: DataTypes.STRING, primaryKey: true},
        url: DataTypes.STRING,
    }, {
        classMethods: {
            associate: function(models) {
                EpisodeStatus.belongsTo(models.Episode, {
                    onDelete: "CASCADE",
                    foreignKey: {
                        allowNull: false,
                        primaryKey: true
                    }
                });
            }
        },
        timestamps: true,
        createdAt: false,
        
    });
    return EpisodeStatus;
};