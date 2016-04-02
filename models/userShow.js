module.exports = function(sequelize, DataTypes) {
    var UserShow = sequelize.define("UserShow", {
        last_season: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 0},
        last_episode: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 0},
        enabled: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        favourite: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    }, {
        classMethods: {
            associate: function(models) {
                //UserShow.belongsTo(models.User);
                //UserShow.belongsTo(models.Show);
            }
        },
        
        timestamps: true,
        paranoid: true
    });
    return UserShow;
};

