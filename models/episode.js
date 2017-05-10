module.exports = function(sequelize, DataTypes) {
    var Episode = sequelize.define("Episode", {
        id: {type: DataTypes.INTEGER, primaryKey: true, allowNull: false},
        season: {type: DataTypes.INTEGER, allowNull: false },
        episode: {type: DataTypes.INTEGER, allowNull: false },
        title: {type: DataTypes.STRING, allowNull: false },
        airdate: {type: DataTypes.DATEONLY, allowNull: true }
    }, {
        classMethods: {
            associate: function(models) {
                Episode.belongsTo(models.Show);
            }
        },
        
        timestamps: false
        
    });
    return Episode;
};
